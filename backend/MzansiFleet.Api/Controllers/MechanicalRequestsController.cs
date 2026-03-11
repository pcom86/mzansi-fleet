using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Application.Handlers;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Repository;
using MzansiFleet.Application.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MechanicalRequestsController : ControllerBase
    {
        private readonly CreateMechanicalRequestCommandHandler _createMechanicalRequestHandler;
        private readonly IMechanicalRequestRepository _repository;
        private readonly IMaintenanceHistoryRepository _maintenanceHistoryRepository;
        private readonly IVehicleRepository _vehicleRepository;
        private readonly MzansiFleetDbContext _context;
        private readonly VehicleNotificationService _notificationService;
        private readonly IServiceProviderProfileRepository _serviceProviderProfileRepository;
        
        public MechanicalRequestsController(
            CreateMechanicalRequestCommandHandler createMechanicalRequestHandler,
            IMechanicalRequestRepository repository,
            IMaintenanceHistoryRepository maintenanceHistoryRepository,
            IVehicleRepository vehicleRepository,
            MzansiFleetDbContext context,
            VehicleNotificationService notificationService,
            IServiceProviderProfileRepository serviceProviderProfileRepository)
        {
            _createMechanicalRequestHandler = createMechanicalRequestHandler;
            _repository = repository;
            _maintenanceHistoryRepository = maintenanceHistoryRepository;
            _vehicleRepository = vehicleRepository;
            _context = context;
            _notificationService = notificationService;
            _serviceProviderProfileRepository = serviceProviderProfileRepository;
        }

        [HttpGet]
        public ActionResult<IEnumerable<MechanicalRequest>> GetAll()
        {
            var requests = _repository.GetAll();
            return Ok(requests);
        }

        [HttpGet("my-bookings")]
        [Authorize]
        public ActionResult GetMyBookings()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException());
            var spProfile = _serviceProviderProfileRepository.GetByUserId(userId);
            if (spProfile == null)
                return NotFound(new { error = "Service provider profile not found" });

            var requests = _repository.GetAll()
                .Where(r => r.ServiceProvider == spProfile.BusinessName)
                .OrderByDescending(r => r.ScheduledDate ?? r.CreatedAt)
                .ToList();

            return Ok(requests);
        }

        [HttpGet("provider-schedule/{businessName}")]
        public ActionResult GetProviderSchedule(string businessName)
        {
            var requests = _repository.GetAll()
                .Where(r => r.ServiceProvider == businessName &&
                            (r.State == "Scheduled" || r.State == "Accepted" || r.State == "In Progress"))
                .Select(r => new { r.Id, r.ScheduledDate, r.State, r.Category, r.Description })
                .OrderBy(r => r.ScheduledDate)
                .ToList();

            return Ok(requests);
        }

        [HttpPut("{id}/accept")]
        public ActionResult Accept(Guid id)
        {
            var request = _repository.GetById(id);
            if (request == null)
                return NotFound();

            request.State = "Accepted";
            _repository.Update(request);
            return Ok(request);
        }

        [HttpPut("{id}/start")]
        public ActionResult Start(Guid id)
        {
            var request = _repository.GetById(id);
            if (request == null)
                return NotFound();

            request.State = "In Progress";
            _repository.Update(request);
            return Ok(request);
        }

        [HttpGet("{id}")]
        public ActionResult<MechanicalRequest> GetById(Guid id)
        {
            var request = _repository.GetById(id);
            if (request == null)
                return NotFound();
            
            return Ok(request);
        }

        [HttpPost]
        public async System.Threading.Tasks.Task<ActionResult<MechanicalRequest>> Create([FromBody] CreateMechanicalRequestCommand command)
        {
            var result = await _createMechanicalRequestHandler.Handle(command, CancellationToken.None);
            
            // Send notification to owner about the maintenance request
            if (result.VehicleId.HasValue)
            {
                await _notificationService.NotifyMaintenanceRequested(
                    result.VehicleId.Value,
                    result.Category,
                    result.Description);
            }
            
            return CreatedAtAction(nameof(Create), new { id = result.Id }, result);
        }

        [HttpDelete("{id}")]
        public ActionResult Delete(Guid id)
        {
            var request = _repository.GetById(id);
            if (request == null)
                return NotFound();

            // Allow deletion if the request is pending, open, or scheduled
            if (request.State != "Pending" && request.State != "OPEN" && request.State != "Scheduled")
                return BadRequest(new { message = "Only pending, open, or scheduled requests can be deleted" });

            _repository.Delete(id);
            return Ok(new { message = "Request deleted successfully" });
        }

        [HttpDelete("{id}/provider")]
        [Authorize]
        public ActionResult DeleteByProvider(Guid id)
        {
            var request = _repository.GetById(id);
            if (request == null)
                return NotFound();

            // Check if the user is a service provider
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            // Get service provider profile to verify
            var providerProfile = _serviceProviderProfileRepository.GetByUserId(Guid.Parse(userId));
            if (providerProfile == null)
                return Forbid();

            // Verify this booking belongs to this service provider
            if (request.ServiceProvider != providerProfile.BusinessName)
                return Forbid();

            // Only allow deletion if the request is scheduled (providers can't delete pending requests they haven't accepted)
            if (request.State != "Scheduled")
                return BadRequest(new { message = "Service providers can only delete scheduled bookings" });

            _repository.Delete(id);
            return Ok(new { message = "Booking deleted successfully" });
        }

        
        [HttpPut("{id}/approve")]
        public async System.Threading.Tasks.Task<ActionResult> Approve(Guid id)
        {
            var request = _repository.GetById(id);
            if (request == null)
                return NotFound();

            request.State = "Approved";
            _repository.Update(request);
            
            // Send notification to driver about the approved request (only if requested by driver)
            if (request.RequestedBy.HasValue && request.VehicleId.HasValue && request.RequestedByType == "Driver")
            {
                await _notificationService.NotifyDriverMaintenanceApproved(
                    request.RequestedBy.Value,
                    request.VehicleId.Value,
                    request.Category);
            }
            
            return Ok(request);
        }

        [HttpPut("{id}/decline")]
        public async System.Threading.Tasks.Task<ActionResult> Decline(Guid id, [FromBody] DeclineRequestDto dto)
        {
            var request = _repository.GetById(id);
            if (request == null)
                return NotFound();

            request.State = "Declined";
            request.DeclineReason = dto.Reason;
            _repository.Update(request);
            
            // Send notification to driver about the declined request (only if requested by driver)
            if (request.RequestedBy.HasValue && request.VehicleId.HasValue && request.RequestedByType == "Driver")
            {
                await _notificationService.NotifyDriverMaintenanceDeclined(
                    request.RequestedBy.Value,
                    request.VehicleId.Value,
                    request.Category,
                    dto.Reason ?? "No reason provided");
            }
            
            return Ok(request);
        }

        [HttpPut("{id}/schedule")]
        public async System.Threading.Tasks.Task<ActionResult> Schedule(Guid id, [FromBody] ScheduleServiceDto dto)
        {
            var request = _repository.GetById(id);
            if (request == null)
                return NotFound();

            request.State = "Scheduled";
            request.ServiceProvider = dto.ServiceProvider;
            request.ScheduledDate = dto.ScheduledDate;
            request.ScheduledBy = dto.ScheduledBy;
            _repository.Update(request);
            
            // Send notification to owner about the scheduled maintenance
            if (request.VehicleId.HasValue && request.ScheduledDate.HasValue)
            {
                await _notificationService.NotifyMaintenanceScheduled(
                    request.VehicleId.Value,
                    request.Category,
                    request.ScheduledDate.Value);
            }
            
            // Send notification to driver about the approved/scheduled request
            if (request.RequestedBy.HasValue && request.VehicleId.HasValue && request.ScheduledDate.HasValue)
            {
                await _notificationService.NotifyDriverMaintenanceScheduled(
                    request.RequestedBy.Value,
                    request.VehicleId.Value,
                    request.Category,
                    request.ScheduledDate.Value,
                    request.ServiceProvider ?? "Service Provider");
            }
            
            // Send notification to service provider about the assigned job
            if (!string.IsNullOrEmpty(request.ServiceProvider) && request.VehicleId.HasValue && request.ScheduledDate.HasValue)
            {
                await _notificationService.NotifyServiceProviderMaintenanceScheduled(
                    request.ServiceProvider,
                    request.VehicleId.Value,
                    request.Category,
                    request.ScheduledDate.Value,
                    request.Description ?? "No description provided");
            }
            
            return Ok(request);
        }

        [HttpPut("{id}/complete")]
        public async System.Threading.Tasks.Task<ActionResult> Complete(Guid id, [FromBody] CompleteServiceDto dto)
        {
            var request = _repository.GetById(id);
            if (request == null)
                return NotFound();

            // Only allow completion if status is Scheduled, Accepted or In Progress
            if (request.State != "Scheduled" && request.State != "Accepted" && request.State != "In Progress")
                return BadRequest(new { message = "Only scheduled, accepted or in-progress requests can be marked as completed" });

            var completedDate = dto.CompletedDate ?? DateTime.UtcNow;
            
            // Update the request
            request.State = "Completed";
            request.CompletedDate = completedDate;
            request.CompletionNotes = dto.CompletionNotes;
            request.ServiceProviderRating = dto.ServiceProviderRating;
            _repository.Update(request);

            // Create MaintenanceHistory record
            if (request.VehicleId.HasValue)
            {
                var maintenanceHistory = new MaintenanceHistory
                {
                    Id = Guid.NewGuid(),
                    VehicleId = request.VehicleId.Value,
                    MaintenanceDate = completedDate,
                    MaintenanceType = request.Category,
                    Component = request.Category,
                    Description = request.Description,
                    MileageAtMaintenance = dto.MileageAtService ?? 0,
                    Cost = dto.ServiceCost ?? 0,
                    ServiceProvider = request.ServiceProvider ?? "Unknown",
                    Priority = request.Priority ?? "Medium",
                    Status = "Completed",
                    ScheduledDate = request.ScheduledDate,
                    CompletedDate = completedDate,
                    Notes = request.CompletionNotes,
                    InvoiceNumber = dto.InvoiceNumber,
                    PerformedBy = request.ServiceProvider,
                    ServiceProviderRating = dto.ServiceProviderRating,
                    CreatedAt = DateTime.UtcNow
                };

                await _maintenanceHistoryRepository.AddAsync(maintenanceHistory);

                // Create Vehicle Expense record for all completed maintenance
                // This tracks costs even if $0 (warranty work, free service, etc.)
                var vehicleExpense = new VehicleExpense
                {
                    Id = Guid.NewGuid(),
                    VehicleId = request.VehicleId.Value,
                    Date = completedDate,
                    Amount = dto.ServiceCost ?? 0,
                    Category = "Maintenance",
                    Description = $"{request.Category} - {request.Description}",
                    InvoiceNumber = dto.InvoiceNumber,
                    Vendor = request.ServiceProvider ?? "Unknown",
                    CreatedAt = DateTime.UtcNow
                };
                
                try
                {
                    _context.VehicleExpenses.Add(vehicleExpense);
                    await _context.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    // Log the error but don't fail the completion
                    // VehicleExpense creation is secondary to the main completion flow
                    Console.WriteLine($"Warning: Failed to create VehicleExpense for request {id}: {ex.Message}");
                    // Continue with completion even if expense creation fails
                }

                // Update vehicle's last service date
                try
                {
                    var vehicle = await _vehicleRepository.GetByIdAsync(request.VehicleId.Value);
                    if (vehicle != null)
                    {
                        vehicle.LastServiceDate = completedDate;
                        
                        // Calculate next service date (e.g., 6 months from now or based on service interval)
                        if (request.Category?.Contains("Service", StringComparison.OrdinalIgnoreCase) == true)
                        {
                            vehicle.NextServiceDate = completedDate.AddMonths(6);
                        }
                        
                        await _vehicleRepository.UpdateAsync(vehicle);
                    }
                }
                catch (Exception ex)
                {
                    // Log the error but don't fail the completion
                    Console.WriteLine($"Warning: Failed to update vehicle {request.VehicleId} after completion: {ex.Message}");
                    // Continue with completion even if vehicle update fails
                }
                
                // Send notification to owner about the completed maintenance
                try
                {
                    await _notificationService.NotifyMaintenanceCompleted(
                        request.VehicleId.Value,
                        request.Category,
                        dto.ServiceCost ?? 0,
                        completedDate);
                }
                catch (Exception ex)
                {
                    // Log the error but don't fail the completion
                    Console.WriteLine($"Warning: Failed to send maintenance completion notification: {ex.Message}");
                    // Continue with completion even if notification fails
                }
            }
            
            return Ok(request);
        }

        [HttpPut("{id}")]
        public ActionResult Update(Guid id, [FromBody] UpdateMechanicalRequestDto dto)
        {
            var request = _repository.GetById(id);
            if (request == null)
                return NotFound();

            // Allow updates if status is not terminal (Completed or Declined)
            if (request.State == "Completed" || request.State == "Declined")
                return BadRequest(new { message = "Completed or declined requests cannot be edited" });

            request.Category = dto.Category;
            request.Description = dto.Description;
            request.Location = dto.Location;
            request.PreferredTime = dto.PreferredTime;
            request.ScheduledDate = dto.ScheduledDate;
            request.CallOutRequired = dto.CallOutRequired;
            request.Priority = dto.Priority;
            _repository.Update(request);
            
            return Ok(request);
        }

        [HttpPost("{id}/review")]
        public ActionResult SubmitReview(Guid id, [FromBody] MechanicalRequestReviewDto dto)
        {
            var request = _repository.GetById(id);
            if (request == null)
                return NotFound();

            if (request.State != "Completed")
                return BadRequest(new { message = "Only completed requests can be reviewed" });

            // Update the rating on the mechanical request
            request.ServiceProviderRating = dto.Rating;
            _repository.Update(request);

            // Also create a Review record
            var review = new Review
            {
                Id = Guid.NewGuid(),
                ReviewerId = dto.UserId,
                TargetId = id,
                TargetType = "MechanicalRequest",
                Rating = dto.Rating,
                Comments = dto.Review ?? "",
                CreatedAt = DateTime.UtcNow
            };

            _context.Reviews.Add(review);
            _context.SaveChanges();

            // Update SP profile rating and totalReviews
            if (!string.IsNullOrEmpty(request.ServiceProvider))
            {
                var spProfile = _context.ServiceProviderProfiles
                    .FirstOrDefault(p => p.BusinessName == request.ServiceProvider);
                if (spProfile != null)
                {
                    // Get all ratings for this SP from completed mechanical requests
                    var allRatings = _context.MechanicalRequests
                        .Where(r => r.ServiceProvider == request.ServiceProvider 
                            && r.State == "Completed" 
                            && r.ServiceProviderRating.HasValue)
                        .Select(r => r.ServiceProviderRating.Value)
                        .ToList();

                    spProfile.TotalReviews = allRatings.Count;
                    spProfile.Rating = allRatings.Count > 0 
                        ? Math.Round((double)allRatings.Sum() / allRatings.Count, 1) 
                        : 0;
                    
                    _context.SaveChanges();
                }
            }

            return Ok(new { message = "Review submitted successfully", rating = dto.Rating });
        }
    }

    public class MechanicalRequestReviewDto
    {
        public Guid RequestId { get; set; }
        public int Rating { get; set; }
        public string Review { get; set; }
        public string Role { get; set; }
        public Guid UserId { get; set; }
    }

    public class UpdateMechanicalRequestDto
    {
        public string Category { get; set; }
        public string Description { get; set; }
        public string Location { get; set; }
        public DateTime? PreferredTime { get; set; }
        public DateTime? ScheduledDate { get; set; }
        public bool CallOutRequired { get; set; }
        public string Priority { get; set; }
    }

    public class DeclineRequestDto
    {
        public string Reason { get; set; }
    }

    public class ScheduleServiceDto
    {
        public string ServiceProvider { get; set; }
        public DateTime ScheduledDate { get; set; }
        public string ScheduledBy { get; set; }
    }

    public class CompleteServiceDto
    {
        public DateTime? CompletedDate { get; set; }
        public string CompletionNotes { get; set; }
        public int? MileageAtService { get; set; }
        public decimal? ServiceCost { get; set; }
        public string InvoiceNumber { get; set; }
        public int? ServiceProviderRating { get; set; } // 1-5 stars rating
    }
}


