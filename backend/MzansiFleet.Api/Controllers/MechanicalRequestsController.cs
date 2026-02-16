using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Application.Handlers;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Repository;
using MzansiFleet.Application.Services;
using System;
using System.Collections.Generic;
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
        
        public MechanicalRequestsController(
            CreateMechanicalRequestCommandHandler createMechanicalRequestHandler,
            IMechanicalRequestRepository repository,
            IMaintenanceHistoryRepository maintenanceHistoryRepository,
            IVehicleRepository vehicleRepository,
            MzansiFleetDbContext context,
            VehicleNotificationService notificationService)
        {
            _createMechanicalRequestHandler = createMechanicalRequestHandler;
            _repository = repository;
            _maintenanceHistoryRepository = maintenanceHistoryRepository;
            _vehicleRepository = vehicleRepository;
            _context = context;
            _notificationService = notificationService;
        }

        [HttpGet]
        public ActionResult<IEnumerable<MechanicalRequest>> GetAll()
        {
            var requests = _repository.GetAll();
            return Ok(requests);
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

            // Only allow completion if status is Scheduled or In Progress
            if (request.State != "Scheduled" && request.State != "In Progress")
                return BadRequest(new { message = "Only scheduled or in-progress requests can be marked as completed" });

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
                
                _context.VehicleExpenses.Add(vehicleExpense);
                await _context.SaveChangesAsync();

                // Update vehicle's last service date
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
                
                // Send notification to owner about the completed maintenance
                await _notificationService.NotifyMaintenanceCompleted(
                    request.VehicleId.Value,
                    request.Category,
                    dto.ServiceCost ?? 0,
                    completedDate);
            }
            
            return Ok(request);
        }

        [HttpPut("{id}")]
        public ActionResult Update(Guid id, [FromBody] UpdateMechanicalRequestDto dto)
        {
            var request = _repository.GetById(id);
            if (request == null)
                return NotFound();

            // Only allow updates if status is Pending
            if (request.State != "Pending")
                return BadRequest(new { message = "Only pending requests can be edited" });

            request.Category = dto.Category;
            request.Description = dto.Description;
            request.Location = dto.Location;
            request.PreferredTime = dto.PreferredTime;
            request.CallOutRequired = dto.CallOutRequired;
            request.Priority = dto.Priority;
            _repository.Update(request);
            
            return Ok(request);
        }

        [HttpDelete("{id}")]
        public ActionResult Delete(Guid id)
        {
            var request = _repository.GetById(id);
            if (request == null)
                return NotFound();

            // Only allow deletion if status is Pending
            if (request.State != "Pending")
                return BadRequest(new { message = "Only pending requests can be deleted" });

            _repository.Delete(id);
            
            return Ok(new { message = "Request deleted successfully" });
        }
    }

    public class UpdateMechanicalRequestDto
    {
        public string Category { get; set; }
        public string Description { get; set; }
        public string Location { get; set; }
        public DateTime? PreferredTime { get; set; }
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

