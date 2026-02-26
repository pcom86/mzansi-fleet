#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.DTOs;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Repository;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/Tenders")]
    [Authorize]
    public class TenderController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public TenderController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        // POST: api/Tender
        [HttpPost]
        public async Task<ActionResult<TenderDto>> CreateTender([FromBody] CreateTenderDto dto)
        {
            var userIdClaim = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized("Invalid user");
            }

            var tender = new Tender
            {
                Id = Guid.NewGuid(),
                Title = dto.Title,
                Description = dto.Description,
                RequirementDetails = dto.RequirementDetails,
                BudgetMin = dto.BudgetMin,
                BudgetMax = dto.BudgetMax,
                TransportType = dto.TransportType,
                RequiredVehicles = dto.RequiredVehicles,
                RouteDetails = dto.RouteDetails,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                ApplicationDeadline = dto.ApplicationDeadline,
                PickupLocation = dto.PickupLocation,
                DropoffLocation = dto.DropoffLocation,
                ServiceArea = dto.ServiceArea,
                TenderPublisherId = userId,
                Status = "Open",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Tenders.Add(tender);
            await _context.SaveChangesAsync();

            var user = await _context.Users.FindAsync(userId);
            
            return CreatedAtAction(nameof(GetTenderById), new { id = tender.Id }, new TenderDto
            {
                Id = tender.Id,
                Title = tender.Title,
                Description = tender.Description,
                RequirementDetails = tender.RequirementDetails,
                BudgetMin = tender.BudgetMin,
                BudgetMax = tender.BudgetMax,
                TransportType = tender.TransportType,
                RequiredVehicles = tender.RequiredVehicles,
                RouteDetails = tender.RouteDetails,
                StartDate = tender.StartDate,
                EndDate = tender.EndDate,
                ApplicationDeadline = tender.ApplicationDeadline,
                PickupLocation = tender.PickupLocation,
                DropoffLocation = tender.DropoffLocation,
                ServiceArea = tender.ServiceArea,
                TenderPublisherId = tender.TenderPublisherId,
                PublisherName = user?.Email ?? "",
                PublisherEmail = user?.Email ?? "",
                Status = tender.Status,
                CreatedAt = tender.CreatedAt,
                UpdatedAt = tender.UpdatedAt,
                ApplicationCount = 0
            });
        }

        // GET: api/Tender
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<TenderDto>>> GetAllTenders(
            [FromQuery] string? status = null,
            [FromQuery] string? transportType = null,
            [FromQuery] string? location = null)
        {
            var query = _context.Tenders
                .Include(t => t.TenderPublisher)
                .Include(t => t.Applications)
                .Where(t => t.IsActive);

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(t => t.Status == status);
            }

            if (!string.IsNullOrEmpty(transportType))
            {
                query = query.Where(t => t.TransportType == transportType);
            }

            if (!string.IsNullOrEmpty(location))
            {
                query = query.Where(t => 
                    t.PickupLocation.Contains(location) || 
                    t.DropoffLocation.Contains(location) ||
                    t.ServiceArea.Contains(location));
            }

            var tenders = await query
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new TenderDto
                {
                    Id = t.Id,
                    Title = t.Title,
                    Description = t.Description,
                    RequirementDetails = t.RequirementDetails,
                    BudgetMin = t.BudgetMin,
                    BudgetMax = t.BudgetMax,
                    TransportType = t.TransportType,
                    RequiredVehicles = t.RequiredVehicles,
                    RouteDetails = t.RouteDetails,
                    StartDate = t.StartDate,
                    EndDate = t.EndDate,
                    ApplicationDeadline = t.ApplicationDeadline,
                    PickupLocation = t.PickupLocation,
                    DropoffLocation = t.DropoffLocation,
                    ServiceArea = t.ServiceArea,
                    TenderPublisherId = t.TenderPublisherId,
                    PublisherName = t.TenderPublisher!.Email,
                    PublisherEmail = t.TenderPublisher!.Email,
                    Status = t.Status,
                    AwardedToOwnerId = t.AwardedToOwnerId,
                    AwardedToOwnerName = t.AwardedToOwner != null ? t.AwardedToOwner.CompanyName : null,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt,
                    ApplicationCount = t.Applications.Count
                })
                .ToListAsync();

            return Ok(tenders);
        }

        // GET: api/Tender/{id}
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<ActionResult<TenderDto>> GetTenderById(Guid id)
        {
            var tender = await _context.Tenders
                .Include(t => t.TenderPublisher)
                .Include(t => t.AwardedToOwner)
                .Include(t => t.Applications)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (tender == null)
            {
                return NotFound();
            }

            return Ok(new TenderDto
            {
                Id = tender.Id,
                Title = tender.Title,
                Description = tender.Description,
                RequirementDetails = tender.RequirementDetails,
                BudgetMin = tender.BudgetMin,
                BudgetMax = tender.BudgetMax,
                TransportType = tender.TransportType,
                RequiredVehicles = tender.RequiredVehicles,
                RouteDetails = tender.RouteDetails,
                StartDate = tender.StartDate,
                EndDate = tender.EndDate,
                ApplicationDeadline = tender.ApplicationDeadline,
                PickupLocation = tender.PickupLocation,
                DropoffLocation = tender.DropoffLocation,
                ServiceArea = tender.ServiceArea,
                TenderPublisherId = tender.TenderPublisherId,
                PublisherName = tender.TenderPublisher!.Email,
                PublisherEmail = tender.TenderPublisher!.Email,
                Status = tender.Status,
                AwardedToOwnerId = tender.AwardedToOwnerId,
                AwardedToOwnerName = tender.AwardedToOwner?.CompanyName,
                CreatedAt = tender.CreatedAt,
                UpdatedAt = tender.UpdatedAt,
                ApplicationCount = tender.Applications.Count
            });
        }

        // GET: api/Tender/my-tenders
        [HttpGet("my-tenders")]
        public async Task<ActionResult<IEnumerable<TenderDto>>> GetMyTenders()
        {
            var userIdClaim = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized("Invalid user");
            }

            var tenders = await _context.Tenders
                .Include(t => t.TenderPublisher)
                .Include(t => t.AwardedToOwner)
                .Include(t => t.Applications)
                .Where(t => t.TenderPublisherId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new TenderDto
                {
                    Id = t.Id,
                    Title = t.Title,
                    Description = t.Description,
                    RequirementDetails = t.RequirementDetails,
                    BudgetMin = t.BudgetMin,
                    BudgetMax = t.BudgetMax,
                    TransportType = t.TransportType,
                    RequiredVehicles = t.RequiredVehicles,
                    RouteDetails = t.RouteDetails,
                    StartDate = t.StartDate,
                    EndDate = t.EndDate,
                    ApplicationDeadline = t.ApplicationDeadline,
                    PickupLocation = t.PickupLocation,
                    DropoffLocation = t.DropoffLocation,
                    ServiceArea = t.ServiceArea,
                    TenderPublisherId = t.TenderPublisherId,
                    PublisherName = t.TenderPublisher!.Email,
                    PublisherEmail = t.TenderPublisher!.Email,
                    Status = t.Status,
                    AwardedToOwnerId = t.AwardedToOwnerId,
                    AwardedToOwnerName = t.AwardedToOwner != null ? t.AwardedToOwner.CompanyName : null,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt,
                    ApplicationCount = t.Applications.Count
                })
                .ToListAsync();

            return Ok(tenders);
        }

        // PUT: api/Tender/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<TenderDto>> UpdateTender(Guid id, [FromBody] CreateTenderDto dto)
        {
            var userIdClaim = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized("Invalid user");
            }

            var tender = await _context.Tenders
                .Include(t => t.Applications)
                .Include(t => t.TenderPublisher)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (tender == null)
            {
                return NotFound("Tender not found");
            }

            // Only tender publisher can update
            if (tender.TenderPublisherId != userId)
            {
                return Forbid();
            }

            // Only allow editing if tender is still Open
            if (tender.Status != "Open")
            {
                return BadRequest("Cannot edit tender that is not in Open status");
            }

            // Update tender fields
            tender.Title = dto.Title;
            tender.Description = dto.Description;
            tender.RequirementDetails = dto.RequirementDetails;
            tender.BudgetMin = dto.BudgetMin;
            tender.BudgetMax = dto.BudgetMax;
            tender.TransportType = dto.TransportType;
            tender.RequiredVehicles = dto.RequiredVehicles;
            tender.RouteDetails = dto.RouteDetails;
            tender.StartDate = dto.StartDate;
            tender.EndDate = dto.EndDate;
            tender.ApplicationDeadline = dto.ApplicationDeadline;
            tender.PickupLocation = dto.PickupLocation;
            tender.DropoffLocation = dto.DropoffLocation;
            tender.ServiceArea = dto.ServiceArea;
            tender.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new TenderDto
            {
                Id = tender.Id,
                Title = tender.Title,
                Description = tender.Description,
                RequirementDetails = tender.RequirementDetails,
                BudgetMin = tender.BudgetMin,
                BudgetMax = tender.BudgetMax,
                TransportType = tender.TransportType,
                RequiredVehicles = tender.RequiredVehicles,
                RouteDetails = tender.RouteDetails,
                StartDate = tender.StartDate,
                EndDate = tender.EndDate,
                ApplicationDeadline = tender.ApplicationDeadline,
                PickupLocation = tender.PickupLocation,
                DropoffLocation = tender.DropoffLocation,
                ServiceArea = tender.ServiceArea,
                TenderPublisherId = tender.TenderPublisherId,
                PublisherName = tender.TenderPublisher!.Email,
                PublisherEmail = tender.TenderPublisher!.Email,
                Status = tender.Status,
                CreatedAt = tender.CreatedAt,
                UpdatedAt = tender.UpdatedAt,
                ApplicationCount = tender.Applications.Count
            });
        }

        // POST: api/Tender/{id}/apply
        [HttpPost("{id}/apply")]
        public async Task<ActionResult<TenderApplicationDto>> ApplyToTender(Guid id, [FromBody] CreateTenderApplicationDto dto)
        {
            var userIdClaim = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized("Invalid user");
            }

            var tender = await _context.Tenders.FindAsync(id);
            if (tender == null)
            {
                return NotFound("Tender not found");
            }

            if (tender.Status != "Open")
            {
                return BadRequest("This tender is no longer accepting applications");
            }

            var ownerProfile = await _context.OwnerProfiles.FirstOrDefaultAsync(o => o.UserId == userId);
            if (ownerProfile == null)
            {
                return BadRequest("Owner profile not found. Please complete your profile first.");
            }

            // Check if already applied
            var existingApplication = await _context.TenderApplications
                .FirstOrDefaultAsync(ta => ta.TenderId == id && ta.OwnerId == ownerProfile.Id);

            if (existingApplication != null)
            {
                return BadRequest("You have already applied to this tender");
            }

            var application = new TenderApplication
            {
                Id = Guid.NewGuid(),
                TenderId = id,
                OwnerId = ownerProfile.Id,
                ApplicationMessage = dto.ApplicationMessage,
                ProposedBudget = dto.ProposedBudget,
                ProposalDetails = dto.ProposalDetails,
                AvailableVehicles = dto.AvailableVehicles,
                VehicleTypes = dto.VehicleTypes,
                ExperienceHighlights = dto.ExperienceHighlights,
                Status = "Pending",
                AppliedAt = DateTime.UtcNow,
                ContactPerson = dto.ContactPerson,
                ContactPhone = dto.ContactPhone,
                ContactEmail = dto.ContactEmail
            };

            _context.TenderApplications.Add(application);
            await _context.SaveChangesAsync();

            // Send automatic notification message to tender publisher
            try
            {
                var tenderPublisher = await _context.Users.FindAsync(tender.TenderPublisherId);
                var notificationMessage = new Message
                {
                    Id = Guid.NewGuid(),
                    SenderId = userId,
                    ReceiverId = tender.TenderPublisherId,
                    Subject = $"New Application for: {tender.Title}",
                    Content = $"<p><strong>{ownerProfile.CompanyName ?? ownerProfile.ContactName}</strong> has submitted an application for your tender.</p>" +
                             $"<p><strong>Proposed Budget:</strong> R{dto.ProposedBudget:N2}</p>" +
                             $"<p><strong>Available Vehicles:</strong> {dto.AvailableVehicles}</p>" +
                             $"<p><strong>Message:</strong></p><p>{dto.ApplicationMessage}</p>" +
                             $"<p>View the full application details in your tender management dashboard.</p>",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                    RelatedEntityType = "Tender",
                    RelatedEntityId = tender.Id,
                    IsDeletedBySender = false,
                    IsDeletedByReceiver = false
                };
                _context.Messages.Add(notificationMessage);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Log but don't fail the application
                Console.WriteLine($"Failed to send notification message: {ex.Message}");
            }

            return Ok(new TenderApplicationDto
            {
                Id = application.Id,
                TenderId = application.TenderId,
                TenderTitle = tender.Title,
                OwnerId = application.OwnerId,
                OwnerCompanyName = ownerProfile?.CompanyName ?? "",
                OwnerContactName = ownerProfile?.ContactName ?? "",
                ApplicationMessage = application.ApplicationMessage,
                ProposedBudget = application.ProposedBudget,
                ProposalDetails = application.ProposalDetails,
                AvailableVehicles = application.AvailableVehicles,
                VehicleTypes = application.VehicleTypes,
                ExperienceHighlights = application.ExperienceHighlights,
                Status = application.Status,
                AppliedAt = application.AppliedAt,
                ContactPerson = application.ContactPerson,
                ContactPhone = application.ContactPhone,
                ContactEmail = application.ContactEmail
            });
        }

        // GET: api/Tender/{id}/applications
        [HttpGet("{id}/applications")]
        public async Task<ActionResult<IEnumerable<TenderApplicationDto>>> GetTenderApplications(Guid id)
        {
            var userIdClaim = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized("Invalid user");
            }

            var tender = await _context.Tenders.FindAsync(id);
            if (tender == null)
            {
                return NotFound("Tender not found");
            }

            // Only tender publisher can view applications
            if (tender.TenderPublisherId != userId)
            {
                return Forbid();
            }

            var applications = await _context.TenderApplications
                .Include(ta => ta.Tender)
                .Include(ta => ta.Owner)
                .Where(ta => ta.TenderId == id)
                .OrderByDescending(ta => ta.AppliedAt)
                .ToListAsync();

            // Get owner profiles for all applications
            var ownerIds = applications.Select(a => a.OwnerId).Distinct().ToList();
            var ownerProfiles = await _context.OwnerProfiles
                .Where(op => ownerIds.Contains(op.Id))
                .ToDictionaryAsync(op => op.Id, op => op);

            var applicationDtos = new List<TenderApplicationDto>();

            foreach (var app in applications)
            {
                // Get owner profile
                var ownerProfile = ownerProfiles.GetValueOrDefault(app.OwnerId);
                
                Console.WriteLine($"Processing application from OwnerId: {app.OwnerId}");
                Console.WriteLine($"Owner Profile found: {ownerProfile != null}, Company: {ownerProfile?.CompanyName}");
                
                if (ownerProfile == null)
                {
                    Console.WriteLine($"WARNING: No OwnerProfile found for OwnerId: {app.OwnerId}. Application will have limited fleet data.");
                }
                
                // Get fleet summary for each applicant
                // IMPORTANT: Vehicle.TenantId matches User.TenantId, NOT User.Id or OwnerProfile.Id
                var vehiclesByTenantId = new List<Vehicle>();
                
                Console.WriteLine($"=== VEHICLE LOOKUP DEBUG ===");
                Console.WriteLine($"Application OwnerId: {app.OwnerId}");
                Console.WriteLine($"OwnerProfile found: {ownerProfile != null}");
                
                if (ownerProfile != null)
                {
                    Console.WriteLine($"OwnerProfile.Id: {ownerProfile.Id}");
                    Console.WriteLine($"OwnerProfile.UserId: {ownerProfile.UserId}");
                    Console.WriteLine($"OwnerProfile.CompanyName: {ownerProfile.CompanyName}");
                    
                    // Get the User entity to access User.TenantId (which is what Vehicle.TenantId actually matches)
                    var user = await _context.Users.FindAsync(ownerProfile.UserId);
                    
                    if (user != null)
                    {
                        Console.WriteLine($"User.Id: {user.Id}");
                        Console.WriteLine($"User.TenantId: {user.TenantId}");
                        Console.WriteLine($"User.Email: {user.Email}");
                        
                        // Query vehicles by User.TenantId (this is the correct mapping!)
                        vehiclesByTenantId = await _context.Vehicles
                            .Where(v => v.TenantId == user.TenantId)
                            .ToListAsync();
                        Console.WriteLine($"✅ Query by User.TenantId ({user.TenantId}): Found {vehiclesByTenantId.Count} vehicles");
                    }
                    else
                    {
                        Console.WriteLine($"❌ ERROR: No User found for OwnerProfile.UserId {ownerProfile.UserId}");
                    }
                }
                else
                {
                    Console.WriteLine($"❌ ERROR: No OwnerProfile found for OwnerId {app.OwnerId}");
                }
                
                // Diagnostic output only if no vehicles found
                if (vehiclesByTenantId.Count == 0)
                {
                    Console.WriteLine($"⚠️ WARNING: No vehicles found for this application");
                    Console.WriteLine($"   This could mean:");
                    Console.WriteLine($"   - Owner has not added any vehicles yet");
                    Console.WriteLine($"   - Vehicle.TenantId doesn't match User.TenantId");
                    Console.WriteLine($"   - Data integrity issue");
                }
                Console.WriteLine($"=== END VEHICLE LOOKUP DEBUG ===");
                
                var vehicles = vehiclesByTenantId.Select(v => 
                {
                    // Combine PhotoBase64 and Photos array, with PhotoBase64 as first item
                    var allPhotos = new List<string>();
                    if (!string.IsNullOrEmpty(v.PhotoBase64))
                    {
                        allPhotos.Add(v.PhotoBase64);
                    }
                    if (v.Photos != null && v.Photos.Count > 0)
                    {
                        allPhotos.AddRange(v.Photos);
                    }
                    
                    return new VehicleSummaryDto
                    {
                        Id = v.Id,
                        RegistrationNumber = v.Registration,
                        Make = v.Make,
                        Model = v.Model,
                        Year = v.Year,
                        VehicleType = v.Type,
                        Capacity = v.Capacity,
                        Status = v.Status,
                        Mileage = v.Mileage,
                        Photos = allPhotos
                    };
                }).ToList();

                Console.WriteLine($"Final vehicle count: {vehicles.Count}");

                decimal totalRevenue = 0;
                try
                {
                    totalRevenue = await _context.VehicleEarningRecords
                        .Where(e => vehicles.Select(v => v.Id).Contains(e.VehicleId))
                        .SumAsync(e => e.Amount);
                }
                catch (Exception)
                {
                    // VehicleEarningRecords table might not exist yet
                    totalRevenue = 0;
                }

                var fleetSummary = new OwnerFleetSummaryDto
                {
                    OwnerId = app.OwnerId,
                    CompanyName = ownerProfile?.CompanyName ?? "N/A",
                    ContactName = ownerProfile?.ContactName ?? app.ContactPerson,
                    ContactPhone = ownerProfile?.ContactPhone ?? app.ContactPhone,
                    ContactEmail = ownerProfile?.ContactEmail ?? app.ContactEmail,
                    Address = ownerProfile?.Address ?? "",
                    TotalVehicles = vehicles.Count,
                    ActiveVehicles = vehicles.Count(v => v.Status == "Active"),
                    Vehicles = vehicles,
                    TotalRevenue = totalRevenue,
                    CompletedJobs = 0, // Can be calculated from maintenance/service history
                    AverageRating = null // Can be calculated from reviews
                };

                Console.WriteLine($"FleetSummary created with {fleetSummary.Vehicles.Count} vehicles");
                Console.WriteLine($"Company: {fleetSummary.CompanyName}, Total Vehicles: {fleetSummary.TotalVehicles}");

                applicationDtos.Add(new TenderApplicationDto
                {
                    Id = app.Id,
                    TenderId = app.TenderId,
                    TenderTitle = app.Tender!.Title,
                    OwnerId = app.OwnerId,
                    OwnerCompanyName = ownerProfile?.CompanyName ?? "N/A",
                    OwnerContactName = ownerProfile?.ContactName ?? app.ContactPerson,
                    ApplicationMessage = app.ApplicationMessage,
                    ProposedBudget = app.ProposedBudget,
                    ProposalDetails = app.ProposalDetails,
                    AvailableVehicles = app.AvailableVehicles,
                    VehicleTypes = app.VehicleTypes,
                    ExperienceHighlights = app.ExperienceHighlights,
                    Status = app.Status,
                    AppliedAt = app.AppliedAt,
                    ReviewedAt = app.ReviewedAt,
                    ReviewNotes = app.ReviewNotes,
                    ContactPerson = app.ContactPerson,
                    ContactPhone = app.ContactPhone,
                    ContactEmail = app.ContactEmail,
                    FleetSummary = fleetSummary
                });
            }

            return Ok(applicationDtos);
        }

        // PUT: api/Tender/applications/{applicationId}/status
        [HttpPut("applications/{applicationId}/status")]
        public async Task<ActionResult> UpdateApplicationStatus(
            Guid applicationId, 
            [FromBody] UpdateTenderApplicationStatusDto dto)
        {
            var userIdClaim = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized("Invalid user");
            }

            var application = await _context.TenderApplications
                .Include(ta => ta.Tender)
                .FirstOrDefaultAsync(ta => ta.Id == applicationId);

            if (application == null)
            {
                return NotFound("Application not found");
            }

            // Only tender publisher can update application status
            if (application.Tender!.TenderPublisherId != userId)
            {
                return Forbid();
            }

            application.Status = dto.Status;
            application.ReviewedAt = DateTime.UtcNow;
            application.ReviewNotes = dto.ReviewNotes;

            // Get owner and tender publisher info for notifications
            var ownerProfile = await _context.OwnerProfiles.FindAsync(application.OwnerId);
            var ownerUser = ownerProfile != null ? await _context.Users.FirstOrDefaultAsync(u => u.Id == ownerProfile.UserId) : null;

            // If accepting this application, award the tender
            if (dto.Status == "Accepted")
            {
                application.Tender.Status = "Awarded";
                application.Tender.AwardedToOwnerId = application.OwnerId;
                application.Tender.UpdatedAt = DateTime.UtcNow;

                // Send acceptance notification
                if (ownerUser != null)
                {
                    try
                    {
                        var acceptanceMessage = new Message
                        {
                            Id = Guid.NewGuid(),
                            SenderId = userId,
                            ReceiverId = ownerUser.Id,
                            Subject = $"🎉 Application Accepted: {application.Tender.Title}",
                            Content = $"<p><strong>Congratulations!</strong> Your application for <strong>{application.Tender.Title}</strong> has been accepted!</p>" +
                                     $"<p><strong>Proposed Budget:</strong> R{application.ProposedBudget:N2}</p>" +
                                     $"<p><strong>Review Notes:</strong></p><p>{dto.ReviewNotes ?? "No additional notes provided."}</p>" +
                                     $"<p>The tender publisher will contact you shortly with further details.</p>",
                            IsRead = false,
                            CreatedAt = DateTime.UtcNow,
                            RelatedEntityType = "Tender",
                            RelatedEntityId = application.TenderId,
                            IsDeletedBySender = false,
                            IsDeletedByReceiver = false
                        };
                        _context.Messages.Add(acceptanceMessage);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to send acceptance notification: {ex.Message}");
                    }
                }

                // Reject all other applications
                var otherApplications = await _context.TenderApplications
                    .Where(ta => ta.TenderId == application.TenderId && ta.Id != applicationId)
                    .ToListAsync();

                foreach (var otherApp in otherApplications)
                {
                    otherApp.Status = "Rejected";
                    otherApp.ReviewedAt = DateTime.UtcNow;
                    otherApp.ReviewNotes = "Tender awarded to another applicant";

                    // Send rejection notification
                    var otherOwnerProfile = await _context.OwnerProfiles.FindAsync(otherApp.OwnerId);
                    var otherOwnerUser = otherOwnerProfile != null ? await _context.Users.FirstOrDefaultAsync(u => u.Id == otherOwnerProfile.UserId) : null;
                    
                    if (otherOwnerUser != null)
                    {
                        try
                        {
                            var rejectionMessage = new Message
                            {
                                Id = Guid.NewGuid(),
                                SenderId = userId,
                                ReceiverId = otherOwnerUser.Id,
                                Subject = $"Application Update: {application.Tender.Title}",
                                Content = $"<p>Thank you for your interest in <strong>{application.Tender.Title}</strong>.</p>" +
                                         $"<p>Unfortunately, your application was not selected at this time. The tender has been awarded to another applicant.</p>" +
                                         $"<p>We appreciate your submission and encourage you to apply for future opportunities.</p>",
                                IsRead = false,
                                CreatedAt = DateTime.UtcNow,
                                RelatedEntityType = "Tender",
                                RelatedEntityId = application.TenderId,
                                IsDeletedBySender = false,
                                IsDeletedByReceiver = false
                            };
                            _context.Messages.Add(rejectionMessage);
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Failed to send rejection notification: {ex.Message}");
                        }
                    }
                }
            }
            else if (dto.Status == "Rejected" && ownerUser != null)
            {
                // Send rejection notification for individually rejected application
                try
                {
                    var rejectionMessage = new Message
                    {
                        Id = Guid.NewGuid(),
                        SenderId = userId,
                        ReceiverId = ownerUser.Id,
                        Subject = $"Application Update: {application.Tender.Title}",
                        Content = $"<p>Thank you for your interest in <strong>{application.Tender.Title}</strong>.</p>" +
                                 $"<p>After careful review, we have decided not to move forward with your application.</p>" +
                                 $"<p><strong>Review Notes:</strong></p><p>{dto.ReviewNotes ?? "No additional notes provided."}</p>" +
                                 $"<p>We appreciate your submission and encourage you to apply for future opportunities.</p>",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow,
                        RelatedEntityType = "Tender",
                        RelatedEntityId = application.TenderId,
                        IsDeletedBySender = false,
                        IsDeletedByReceiver = false
                    };
                    _context.Messages.Add(rejectionMessage);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to send rejection notification: {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Application status updated successfully" });
        }

        // GET: api/Tender/my-applications
        [HttpGet("my-applications")]
        public async Task<ActionResult<IEnumerable<TenderApplicationDto>>> GetMyApplications()
        {
            var userIdClaim = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized("Invalid user");
            }

            var ownerProfile = await _context.OwnerProfiles.FirstOrDefaultAsync(o => o.UserId == userId);
            if (ownerProfile == null)
            {
                return BadRequest("Owner profile not found");
            }

            var applications = await _context.TenderApplications
                .Include(ta => ta.Tender)
                .Include(ta => ta.Owner)
                .Where(ta => ta.OwnerId == ownerProfile.Id)
                .OrderByDescending(ta => ta.AppliedAt)
                .Select(ta => new TenderApplicationDto
                {
                    Id = ta.Id,
                    TenderId = ta.TenderId,
                    TenderTitle = ta.Tender!.Title,
                    OwnerId = ta.OwnerId,
                    OwnerCompanyName = ta.Owner!.CompanyName,
                    OwnerContactName = ta.Owner.ContactName,
                    ApplicationMessage = ta.ApplicationMessage,
                    ProposedBudget = ta.ProposedBudget,
                    ProposalDetails = ta.ProposalDetails,
                    AvailableVehicles = ta.AvailableVehicles,
                    VehicleTypes = ta.VehicleTypes,
                    ExperienceHighlights = ta.ExperienceHighlights,
                    Status = ta.Status,
                    AppliedAt = ta.AppliedAt,
                    ReviewedAt = ta.ReviewedAt,
                    ReviewNotes = ta.ReviewNotes,
                    ContactPerson = ta.ContactPerson,
                    ContactPhone = ta.ContactPhone,
                    ContactEmail = ta.ContactEmail
                })
                .ToListAsync();

            return Ok(applications);
        }

        // DELETE: api/Tender/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteTender(Guid id)
        {
            var userIdClaim = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized("Invalid user");
            }

            var tender = await _context.Tenders.FindAsync(id);
            if (tender == null)
            {
                return NotFound();
            }

            if (tender.TenderPublisherId != userId)
            {
                return Forbid();
            }

            tender.IsActive = false;
            tender.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Tender deleted successfully" });
        }
    }
}
