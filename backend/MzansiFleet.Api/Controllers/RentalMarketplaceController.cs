using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.DTOs;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class RentalMarketplaceController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public RentalMarketplaceController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst("userId") ?? User.FindFirst(ClaimTypes.NameIdentifier);
            return Guid.Parse(userIdClaim!.Value);
        }

        private Guid GetCurrentTenantId()
        {
            var tenantIdClaim = User.FindFirst("tenant_id");
            if (tenantIdClaim == null || string.IsNullOrEmpty(tenantIdClaim.Value))
            {
                // If tenant_id is not in claims, get it from the user record
                var userIdClaim = User.FindFirst("userId") ?? User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim != null)
                {
                    var userId = Guid.Parse(userIdClaim.Value);
                    var user = _context.Users.Find(userId);
                    if (user != null)
                    {
                        return user.TenantId;
                    }
                }
                throw new InvalidOperationException("Tenant ID not found in claims or user record");
            }
            return Guid.Parse(tenantIdClaim.Value);
        }

        // POST: api/RentalMarketplace/requests
        [HttpPost("requests")]
        public async Task<ActionResult<RentalRequestDto>> CreateRentalRequest([FromBody] CreateRentalRequestDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                var tenantId = GetCurrentTenantId();

                var durationDays = (dto.EndDate - dto.StartDate).Days + 1;

                var request = new VehicleRentalRequest
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    TenantId = tenantId,
                    VehicleType = dto.VehicleType,
                    SeatingCapacity = dto.SeatingCapacity,
                    PickupLocation = dto.PickupLocation,
                    DropoffLocation = dto.DropoffLocation,
                    StartDate = dto.StartDate,
                    EndDate = dto.EndDate,
                    DurationDays = durationDays,
                    TripPurpose = dto.TripPurpose,
                    SpecialRequirements = dto.SpecialRequirements,
                    BudgetMin = dto.BudgetMin,
                    BudgetMax = dto.BudgetMax,
                    Status = "Open",
                    CreatedAt = DateTime.UtcNow
                };

                _context.VehicleRentalRequests.Add(request);
                await _context.SaveChangesAsync();

                var user = await _context.Users.FindAsync(userId);

                return Ok(new RentalRequestDto
                {
                    Id = request.Id,
                    UserId = request.UserId,
                    UserName = user?.Email ?? "Unknown",
                    UserEmail = user?.Email ?? "",
                    VehicleType = request.VehicleType,
                    SeatingCapacity = request.SeatingCapacity,
                    PickupLocation = request.PickupLocation,
                    DropoffLocation = request.DropoffLocation,
                    StartDate = request.StartDate,
                    EndDate = request.EndDate,
                    DurationDays = request.DurationDays,
                    TripPurpose = request.TripPurpose,
                    SpecialRequirements = request.SpecialRequirements,
                    BudgetMin = request.BudgetMin,
                    BudgetMax = request.BudgetMax,
                    Status = request.Status,
                    CreatedAt = request.CreatedAt,
                    OfferCount = 0,
                    HasMyOffer = false
                });
            }
            catch (Exception ex)
            {
                var innerMessage = ex.InnerException?.Message ?? ex.Message;
                var stackTrace = ex.InnerException?.StackTrace ?? ex.StackTrace;
                return StatusCode(500, new { 
                    message = "Error creating rental request", 
                    detail = innerMessage,
                    stackTrace = stackTrace
                });
            }
        }

        // GET: api/RentalMarketplace/requests (My requests)
        [HttpGet("requests")]
        public async Task<ActionResult<IEnumerable<RentalRequestDto>>> GetMyRentalRequests()
        {
            try
            {
                var userId = GetCurrentUserId();

                var requests = await _context.VehicleRentalRequests
                    .Where(r => r.UserId == userId)
                    .OrderByDescending(r => r.CreatedAt)
                    .ToListAsync();

                var requestDtos = new List<RentalRequestDto>();
                foreach (var request in requests)
                {
                    var offerCount = await _context.RentalOffers
                        .CountAsync(o => o.RentalRequestId == request.Id);

                    var user = await _context.Users.FindAsync(request.UserId);

                    requestDtos.Add(new RentalRequestDto
                    {
                        Id = request.Id,
                        UserId = request.UserId,
                        UserName = user?.Email ?? "Unknown",
                        UserEmail = user?.Email ?? "",
                        VehicleType = request.VehicleType,
                        SeatingCapacity = request.SeatingCapacity,
                        PickupLocation = request.PickupLocation,
                        DropoffLocation = request.DropoffLocation,
                        StartDate = request.StartDate,
                        EndDate = request.EndDate,
                        DurationDays = request.DurationDays,
                        TripPurpose = request.TripPurpose,
                        SpecialRequirements = request.SpecialRequirements,
                        BudgetMin = request.BudgetMin,
                        BudgetMax = request.BudgetMax,
                        Status = request.Status,
                        CreatedAt = request.CreatedAt,
                        OfferCount = offerCount,
                        HasMyOffer = false
                    });
                }

                return Ok(requestDtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching rental requests", detail = ex.Message });
            }
        }

        // GET: api/RentalMarketplace/marketplace (All open requests for owners)
        [HttpGet("marketplace")]
        public async Task<ActionResult<IEnumerable<RentalRequestDto>>> GetMarketplaceRequests()
        {
            try
            {
                var userId = GetCurrentUserId();

                // Get owner profile
                var ownerProfile = await _context.OwnerProfiles
                    .FirstOrDefaultAsync(o => o.UserId == userId);

                var requests = await _context.VehicleRentalRequests
                    .Where(r => r.Status == "Open")
                    .OrderByDescending(r => r.CreatedAt)
                    .ToListAsync();

                var requestDtos = new List<RentalRequestDto>();
                foreach (var request in requests)
                {
                    var offerCount = await _context.RentalOffers
                        .CountAsync(o => o.RentalRequestId == request.Id);

                    var hasMyOffer = false;
                    if (ownerProfile != null)
                    {
                        hasMyOffer = await _context.RentalOffers
                            .AnyAsync(o => o.RentalRequestId == request.Id && o.OwnerId == ownerProfile.Id);
                    }

                    var user = await _context.Users.FindAsync(request.UserId);

                    requestDtos.Add(new RentalRequestDto
                    {
                        Id = request.Id,
                        UserId = request.UserId,
                        UserName = user?.Email ?? "Unknown",
                        UserEmail = user?.Email ?? "",
                        VehicleType = request.VehicleType,
                        SeatingCapacity = request.SeatingCapacity,
                        PickupLocation = request.PickupLocation,
                        DropoffLocation = request.DropoffLocation,
                        StartDate = request.StartDate,
                        EndDate = request.EndDate,
                        DurationDays = request.DurationDays,
                        TripPurpose = request.TripPurpose,
                        SpecialRequirements = request.SpecialRequirements,
                        BudgetMin = request.BudgetMin,
                        BudgetMax = request.BudgetMax,
                        Status = request.Status,
                        CreatedAt = request.CreatedAt,
                        OfferCount = offerCount,
                        HasMyOffer = hasMyOffer
                    });
                }

                return Ok(requestDtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching marketplace requests", detail = ex.Message });
            }
        }

        // POST: api/RentalMarketplace/offers
        [HttpPost("offers")]
        public async Task<ActionResult<RentalOfferDto>> SubmitOffer([FromBody] CreateRentalOfferDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();

                // Get owner profile
                var ownerProfile = await _context.OwnerProfiles
                    .FirstOrDefaultAsync(o => o.UserId == userId);

                if (ownerProfile == null)
                {
                    return BadRequest(new { message = "Only owners can submit offers" });
                }

                // Check if request exists and is open
                var request = await _context.VehicleRentalRequests.FindAsync(dto.RentalRequestId);
                if (request == null || request.Status != "Open")
                {
                    return BadRequest(new { message = "Rental request not available" });
                }

                // Check if already submitted offer
                var existingOffer = await _context.RentalOffers
                    .FirstOrDefaultAsync(o => o.RentalRequestId == dto.RentalRequestId && o.OwnerId == ownerProfile.Id);

                if (existingOffer != null)
                {
                    return BadRequest(new { message = "You have already submitted an offer for this request" });
                }

                // Verify vehicle ownership
                var vehicle = await _context.Vehicles.FindAsync(dto.VehicleId);
                if (vehicle == null)
                {
                    return BadRequest(new { message = "Vehicle not found" });
                }

                var user = await _context.Users.FindAsync(ownerProfile.UserId);
                if (vehicle.TenantId != user?.TenantId)
                {
                    return BadRequest(new { message = "You don't own this vehicle" });
                }

                var totalPrice = dto.PricePerDay * request.DurationDays;
                if (dto.DriverFee.HasValue)
                {
                    totalPrice += dto.DriverFee.Value * request.DurationDays;
                }

                var offer = new RentalOffer
                {
                    Id = Guid.NewGuid(),
                    RentalRequestId = dto.RentalRequestId,
                    OwnerId = ownerProfile.Id,
                    VehicleId = dto.VehicleId,
                    PricePerDay = dto.PricePerDay,
                    TotalPrice = totalPrice,
                    OfferMessage = dto.OfferMessage,
                    TermsAndConditions = dto.TermsAndConditions,
                    IncludesDriver = dto.IncludesDriver,
                    DriverFee = dto.DriverFee,
                    IncludesInsurance = dto.IncludesInsurance,
                    SecurityDeposit = dto.SecurityDeposit,
                    Status = "Pending",
                    SubmittedAt = DateTime.UtcNow
                };

                _context.RentalOffers.Add(offer);
                await _context.SaveChangesAsync();

                // Send notification to rental requester
                try
                {
                    var notificationMessage = new Message
                    {
                        Id = Guid.NewGuid(),
                        SenderId = userId,
                        ReceiverId = request.UserId,
                        Subject = $"New Rental Offer for {request.VehicleType}",
                        Content = $"<p><strong>{ownerProfile.CompanyName ?? ownerProfile.ContactName}</strong> has submitted an offer for your rental request.</p>" +
                                 $"<p><strong>Vehicle:</strong> {vehicle.Make} {vehicle.Model} ({vehicle.Registration})</p>" +
                                 $"<p><strong>Price per Day:</strong> R{dto.PricePerDay:N2}</p>" +
                                 $"<p><strong>Total Price:</strong> R{totalPrice:N2}</p>" +
                                 $"<p><strong>Message:</strong></p><p>{dto.OfferMessage ?? "No message provided"}</p>" +
                                 $"<p>View the full offer details in your rental requests dashboard.</p>",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow,
                        RelatedEntityType = "RentalRequest",
                        RelatedEntityId = request.Id,
                        IsDeletedBySender = false,
                        IsDeletedByReceiver = false
                    };
                    _context.Messages.Add(notificationMessage);
                    await _context.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to send offer notification: {ex.Message}");
                }

                // Build response
                var allPhotos = new List<string>();
                if (!string.IsNullOrEmpty(vehicle.PhotoBase64))
                {
                    allPhotos.Add(vehicle.PhotoBase64);
                }
                if (vehicle.Photos != null && vehicle.Photos.Count > 0)
                {
                    allPhotos.AddRange(vehicle.Photos);
                }

                return Ok(new RentalOfferDto
                {
                    Id = offer.Id,
                    RentalRequestId = offer.RentalRequestId,
                    OwnerId = offer.OwnerId,
                    OwnerCompanyName = ownerProfile.CompanyName,
                    OwnerContactName = ownerProfile.ContactName,
                    OwnerPhone = ownerProfile.ContactPhone,
                    OwnerEmail = ownerProfile.ContactEmail,
                    VehicleId = offer.VehicleId,
                    Vehicle = new VehicleBasicInfoDto
                    {
                        Id = vehicle.Id,
                        Registration = vehicle.Registration,
                        Make = vehicle.Make,
                        Model = vehicle.Model,
                        Year = vehicle.Year,
                        Type = vehicle.Type,
                        Capacity = vehicle.Capacity,
                        Status = vehicle.Status,
                        Photos = allPhotos
                    },
                    PricePerDay = offer.PricePerDay,
                    TotalPrice = offer.TotalPrice,
                    OfferMessage = offer.OfferMessage,
                    TermsAndConditions = offer.TermsAndConditions,
                    IncludesDriver = offer.IncludesDriver,
                    DriverFee = offer.DriverFee,
                    IncludesInsurance = offer.IncludesInsurance,
                    SecurityDeposit = offer.SecurityDeposit,
                    Status = offer.Status,
                    SubmittedAt = offer.SubmittedAt
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error submitting offer", detail = ex.Message });
            }
        }

        // GET: api/RentalMarketplace/requests/{requestId}/offers
        [HttpGet("requests/{requestId}/offers")]
        public async Task<ActionResult<IEnumerable<RentalOfferDto>>> GetOffersForRequest(Guid requestId)
        {
            try
            {
                var userId = GetCurrentUserId();

                // Verify user owns this request
                var request = await _context.VehicleRentalRequests.FindAsync(requestId);
                if (request == null)
                {
                    return NotFound(new { message = "Request not found" });
                }

                if (request.UserId != userId)
                {
                    return Forbid();
                }

                var offers = await _context.RentalOffers
                    .Where(o => o.RentalRequestId == requestId)
                    .OrderByDescending(o => o.SubmittedAt)
                    .ToListAsync();

                var offerDtos = new List<RentalOfferDto>();
                foreach (var offer in offers)
                {
                    var ownerProfile = await _context.OwnerProfiles.FindAsync(offer.OwnerId);
                    var vehicle = await _context.Vehicles.FindAsync(offer.VehicleId);

                    if (ownerProfile == null || vehicle == null) continue;

                    var allPhotos = new List<string>();
                    if (!string.IsNullOrEmpty(vehicle.PhotoBase64))
                    {
                        allPhotos.Add(vehicle.PhotoBase64);
                    }
                    if (vehicle.Photos != null && vehicle.Photos.Count > 0)
                    {
                        allPhotos.AddRange(vehicle.Photos);
                    }

                    offerDtos.Add(new RentalOfferDto
                    {
                        Id = offer.Id,
                        RentalRequestId = offer.RentalRequestId,
                        OwnerId = offer.OwnerId,
                        OwnerCompanyName = ownerProfile.CompanyName,
                        OwnerContactName = ownerProfile.ContactName,
                        OwnerPhone = ownerProfile.ContactPhone,
                        OwnerEmail = ownerProfile.ContactEmail,
                        VehicleId = offer.VehicleId,
                        Vehicle = new VehicleBasicInfoDto
                        {
                            Id = vehicle.Id,
                            Registration = vehicle.Registration,
                            Make = vehicle.Make,
                            Model = vehicle.Model,
                            Year = vehicle.Year,
                            Type = vehicle.Type,
                            Capacity = vehicle.Capacity,
                            Status = vehicle.Status,
                            Photos = allPhotos
                        },
                        PricePerDay = offer.PricePerDay,
                        TotalPrice = offer.TotalPrice,
                        OfferMessage = offer.OfferMessage,
                        TermsAndConditions = offer.TermsAndConditions,
                        IncludesDriver = offer.IncludesDriver,
                        DriverFee = offer.DriverFee,
                        IncludesInsurance = offer.IncludesInsurance,
                        SecurityDeposit = offer.SecurityDeposit,
                        Status = offer.Status,
                        SubmittedAt = offer.SubmittedAt
                    });
                }

                return Ok(offerDtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching offers", detail = ex.Message });
            }
        }

        // GET: api/RentalMarketplace/my-offers
        [HttpGet("my-offers")]
        public async Task<ActionResult<IEnumerable<RentalOfferDto>>> GetMyOffers()
        {
            try
            {
                var userId = GetCurrentUserId();

                // Get owner profile
                var ownerProfile = await _context.OwnerProfiles
                    .FirstOrDefaultAsync(o => o.UserId == userId);

                if (ownerProfile == null)
                {
                    return Ok(new List<RentalOfferDto>());
                }

                var offers = await _context.RentalOffers
                    .Where(o => o.OwnerId == ownerProfile.Id)
                    .OrderByDescending(o => o.SubmittedAt)
                    .ToListAsync();

                var offerDtos = new List<RentalOfferDto>();
                foreach (var offer in offers)
                {
                    var request = await _context.VehicleRentalRequests.FindAsync(offer.RentalRequestId);
                    var vehicle = await _context.Vehicles.FindAsync(offer.VehicleId);

                    if (request == null || vehicle == null) continue;

                    var allPhotos = new List<string>();
                    if (!string.IsNullOrEmpty(vehicle.PhotoBase64))
                    {
                        allPhotos.Add(vehicle.PhotoBase64);
                    }
                    if (vehicle.Photos != null && vehicle.Photos.Count > 0)
                    {
                        allPhotos.AddRange(vehicle.Photos);
                    }

                    offerDtos.Add(new RentalOfferDto
                    {
                        Id = offer.Id,
                        RentalRequestId = offer.RentalRequestId,
                        OwnerId = offer.OwnerId,
                        OwnerCompanyName = ownerProfile.CompanyName,
                        OwnerContactName = ownerProfile.ContactName,
                        OwnerPhone = ownerProfile.ContactPhone,
                        OwnerEmail = ownerProfile.ContactEmail,
                        VehicleId = offer.VehicleId,
                        Vehicle = new VehicleBasicInfoDto
                        {
                            Id = vehicle.Id,
                            Registration = vehicle.Registration,
                            Make = vehicle.Make,
                            Model = vehicle.Model,
                            Year = vehicle.Year,
                            Type = vehicle.Type,
                            Capacity = vehicle.Capacity,
                            Status = vehicle.Status,
                            Photos = allPhotos
                        },
                        // Flat vehicle properties for frontend
                        VehicleMake = vehicle.Make,
                        VehicleModel = vehicle.Model,
                        VehicleYear = vehicle.Year,
                        VehicleRegistration = vehicle.Registration,
                        VehiclePhotoUrls = allPhotos,
                        // Request information
                        RequestVehicleType = request.VehicleType,
                        RequestPickupLocation = request.PickupLocation,
                        RequestDropoffLocation = request.DropoffLocation,
                        RequestStartDate = request.StartDate,
                        RequestEndDate = request.EndDate,
                        // Offer details
                        PricePerDay = offer.PricePerDay,
                        TotalPrice = offer.TotalPrice,
                        OfferMessage = offer.OfferMessage,
                        TermsAndConditions = offer.TermsAndConditions,
                        IncludesDriver = offer.IncludesDriver,
                        DriverFee = offer.DriverFee,
                        IncludesInsurance = offer.IncludesInsurance,
                        SecurityDeposit = offer.SecurityDeposit,
                        Status = offer.Status,
                        SubmittedAt = offer.SubmittedAt
                    });
                }

                return Ok(offerDtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching my offers", detail = ex.Message });
            }
        }

        // POST: api/RentalMarketplace/offers/accept
        [HttpPost("offers/accept")]
        public async Task<ActionResult<RentalBookingDto>> AcceptOffer([FromBody] AcceptRentalOfferDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();

                // Verify request ownership
                var request = await _context.VehicleRentalRequests.FindAsync(dto.RentalRequestId);
                if (request == null)
                {
                    return NotFound(new { message = "Request not found" });
                }

                if (request.UserId != userId)
                {
                    return Forbid();
                }

                if (request.Status != "Open")
                {
                    return BadRequest(new { message = "Request is no longer open" });
                }

                // Get offer
                var offer = await _context.RentalOffers.FindAsync(dto.OfferId);
                if (offer == null || offer.RentalRequestId != dto.RentalRequestId)
                {
                    return NotFound(new { message = "Offer not found" });
                }

                if (offer.Status != "Pending")
                {
                    return BadRequest(new { message = "Offer is no longer available" });
                }

                // Create booking
                var booking = new VehicleRentalBooking
                {
                    Id = Guid.NewGuid(),
                    RentalRequestId = request.Id,
                    RentalOfferId = offer.Id,
                    RenterId = request.UserId,
                    OwnerId = offer.OwnerId,
                    VehicleId = offer.VehicleId,
                    StartDate = DateTime.SpecifyKind(request.StartDate, DateTimeKind.Utc),
                    EndDate = DateTime.SpecifyKind(request.EndDate, DateTimeKind.Utc),
                    DurationDays = request.DurationDays,
                    TotalAmount = offer.TotalPrice,
                    PickupLocation = request.PickupLocation,
                    DropoffLocation = request.DropoffLocation,
                    Status = "Confirmed",
                    BookedAt = DateTime.UtcNow
                };

                _context.VehicleRentalBookings.Add(booking);

                // Update request status
                request.Status = "Accepted";
                request.ClosedAt = DateTime.UtcNow;
                request.AcceptedOfferId = offer.Id;

                // Update offer status
                offer.Status = "Accepted";
                offer.ResponsedAt = DateTime.UtcNow;

                // Send acceptance notification to owner
                var ownerProfile = await _context.OwnerProfiles.FindAsync(offer.OwnerId);
                var ownerUser = ownerProfile != null ? await _context.Users.FirstOrDefaultAsync(u => u.Id == ownerProfile.UserId) : null;
                var vehicle = await _context.Vehicles.FindAsync(offer.VehicleId);
                
                if (ownerUser != null)
                {
                    try
                    {
                        var acceptanceMessage = new Message
                        {
                            Id = Guid.NewGuid(),
                            SenderId = userId,
                            ReceiverId = ownerUser.Id,
                            Subject = $"🎉 Rental Offer Accepted: {vehicle?.Make} {vehicle?.Model}",
                            Content = $"<p><strong>Great news!</strong> Your rental offer has been accepted!</p>" +
                                     $"<p><strong>Vehicle:</strong> {vehicle?.Make} {vehicle?.Model} ({vehicle?.Registration})</p>" +
                                     $"<p><strong>Rental Period:</strong> {request.StartDate:MMM dd} - {request.EndDate:MMM dd, yyyy}</p>" +
                                     $"<p><strong>Total Amount:</strong> R{offer.TotalPrice:N2}</p>" +
                                     $"<p><strong>Pickup:</strong> {request.PickupLocation}</p>" +
                                     $"<p>Please prepare the vehicle for pickup. The renter will contact you shortly.</p>",
                            IsRead = false,
                            CreatedAt = DateTime.UtcNow,
                            RelatedEntityType = "RentalBooking",
                            RelatedEntityId = booking.Id,
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

                // Reject all other offers
                var otherOffers = await _context.RentalOffers
                    .Where(o => o.RentalRequestId == request.Id && o.Id != offer.Id && o.Status == "Pending")
                    .ToListAsync();

                foreach (var otherOffer in otherOffers)
                {
                    otherOffer.Status = "Rejected";
                    otherOffer.ResponsedAt = DateTime.UtcNow;

                    // Send rejection notification to other owners
                    var otherOwnerProfile = await _context.OwnerProfiles.FindAsync(otherOffer.OwnerId);
                    var otherOwnerUser = otherOwnerProfile != null ? await _context.Users.FirstOrDefaultAsync(u => u.Id == otherOwnerProfile.UserId) : null;
                    var otherVehicle = await _context.Vehicles.FindAsync(otherOffer.VehicleId);
                    
                    if (otherOwnerUser != null)
                    {
                        try
                        {
                            var rejectionMessage = new Message
                            {
                                Id = Guid.NewGuid(),
                                SenderId = userId,
                                ReceiverId = otherOwnerUser.Id,
                                Subject = $"Rental Offer Update: {otherVehicle?.Make} {otherVehicle?.Model}",
                                Content = $"<p>Thank you for submitting your rental offer.</p>" +
                                         $"<p>The requester has chosen another vehicle for this rental period. We appreciate your offer and encourage you to check for other rental opportunities.</p>" +
                                         $"<p><strong>Vehicle:</strong> {otherVehicle?.Make} {otherVehicle?.Model} ({otherVehicle?.Registration})</p>" +
                                         $"<p><strong>Requested Period:</strong> {request.StartDate:MMM dd} - {request.EndDate:MMM dd, yyyy}</p>",
                                IsRead = false,
                                CreatedAt = DateTime.UtcNow,
                                RelatedEntityType = "RentalRequest",
                                RelatedEntityId = request.Id,
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

                await _context.SaveChangesAsync();

                // Build response
                var renter = await _context.Users.FindAsync(request.UserId);

                var allPhotos = new List<string>();
                if (vehicle != null)
                {
                    if (!string.IsNullOrEmpty(vehicle.PhotoBase64))
                    {
                        allPhotos.Add(vehicle.PhotoBase64);
                    }
                    if (vehicle.Photos != null && vehicle.Photos.Count > 0)
                    {
                        allPhotos.AddRange(vehicle.Photos);
                    }
                }

                return Ok(new RentalBookingDto
                {
                    Id = booking.Id,
                    RentalRequestId = booking.RentalRequestId,
                    RenterId = booking.RenterId,
                    RenterName = renter?.Email ?? "Unknown",
                    OwnerId = booking.OwnerId,
                    OwnerCompanyName = ownerProfile?.CompanyName ?? "Unknown",
                    OwnerContactName = ownerProfile?.ContactName ?? "",
                    OwnerPhone = ownerProfile?.ContactPhone ?? "",
                    Vehicle = vehicle != null ? new VehicleBasicInfoDto
                    {
                        Id = vehicle.Id,
                        Registration = vehicle.Registration,
                        Make = vehicle.Make,
                        Model = vehicle.Model,
                        Year = vehicle.Year,
                        Type = vehicle.Type,
                        Capacity = vehicle.Capacity,
                        Status = vehicle.Status,
                        Photos = allPhotos
                    } : null,
                    StartDate = booking.StartDate,
                    EndDate = booking.EndDate,
                    DurationDays = booking.DurationDays,
                    TotalAmount = booking.TotalAmount,
                    PickupLocation = booking.PickupLocation,
                    DropoffLocation = booking.DropoffLocation,
                    Status = booking.Status,
                    BookedAt = booking.BookedAt
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error accepting offer", detail = ex.Message });
            }
        }

        // POST: api/RentalMarketplace/offers/reject
        [HttpPost("offers/reject")]
        public async Task<ActionResult> RejectOffer([FromBody] RejectRentalOfferDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();

                // Verify request ownership
                var request = await _context.VehicleRentalRequests.FindAsync(dto.RentalRequestId);
                if (request == null)
                {
                    return NotFound(new { message = "Request not found" });
                }

                if (request.UserId != userId)
                {
                    return Forbid();
                }

                // Get offer
                var offer = await _context.RentalOffers.FindAsync(dto.OfferId);
                if (offer == null || offer.RentalRequestId != dto.RentalRequestId)
                {
                    return NotFound(new { message = "Offer not found" });
                }

                if (offer.Status != "Pending")
                {
                    return BadRequest(new { message = "Offer has already been processed" });
                }

                // Update offer status
                offer.Status = "Rejected";
                offer.ResponsedAt = DateTime.UtcNow;

                // Send rejection notification to owner
                var ownerProfile = await _context.OwnerProfiles.FindAsync(offer.OwnerId);
                var ownerUser = ownerProfile != null ? await _context.Users.FirstOrDefaultAsync(u => u.Id == ownerProfile.UserId) : null;
                var vehicle = await _context.Vehicles.FindAsync(offer.VehicleId);
                
                if (ownerUser != null)
                {
                    try
                    {
                        var rejectionMessage = new Message
                        {
                            Id = Guid.NewGuid(),
                            SenderId = userId,
                            ReceiverId = ownerUser.Id,
                            Subject = $"Rental Offer Update: {vehicle?.Make} {vehicle?.Model}",
                            Content = $"<p>Thank you for submitting your rental offer.</p>" +
                                     $"<p>After consideration, the requester has decided not to proceed with your offer at this time.</p>" +
                                     $"<p><strong>Vehicle:</strong> {vehicle?.Make} {vehicle?.Model} ({vehicle?.Registration})</p>" +
                                     $"<p><strong>Requested Period:</strong> {request.StartDate:MMM dd} - {request.EndDate:MMM dd, yyyy}</p>" +
                                     $"<p>We appreciate your offer and encourage you to check for other rental opportunities.</p>",
                            IsRead = false,
                            CreatedAt = DateTime.UtcNow,
                            RelatedEntityType = "RentalRequest",
                            RelatedEntityId = request.Id,
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

                return Ok(new { message = "Offer rejected successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error rejecting offer", detail = ex.Message });
            }
        }

        // GET: api/RentalMarketplace/bookings
        [HttpGet("bookings")]
        public async Task<ActionResult<IEnumerable<RentalBookingDto>>> GetMyBookings()
        {
            try
            {
                var userId = GetCurrentUserId();

                // Get bookings as renter
                var renterBookings = await _context.VehicleRentalBookings
                    .Where(b => b.RenterId == userId)
                    .OrderByDescending(b => b.BookedAt)
                    .ToListAsync();

                // Get bookings as owner
                var ownerProfile = await _context.OwnerProfiles
                    .FirstOrDefaultAsync(o => o.UserId == userId);

                List<VehicleRentalBooking> ownerBookings = new List<VehicleRentalBooking>();
                if (ownerProfile != null)
                {
                    ownerBookings = await _context.VehicleRentalBookings
                        .Where(b => b.OwnerId == ownerProfile.Id)
                        .OrderByDescending(b => b.BookedAt)
                        .ToListAsync();
                }

                var allBookings = renterBookings.Concat(ownerBookings).Distinct().ToList();

                var bookingDtos = new List<RentalBookingDto>();
                foreach (var booking in allBookings)
                {
                    var ownerProf = await _context.OwnerProfiles.FindAsync(booking.OwnerId);
                    var vehicle = await _context.Vehicles.FindAsync(booking.VehicleId);
                    var renter = await _context.Users.FindAsync(booking.RenterId);

                    var allPhotos = new List<string>();
                    if (vehicle != null)
                    {
                        if (!string.IsNullOrEmpty(vehicle.PhotoBase64))
                        {
                            allPhotos.Add(vehicle.PhotoBase64);
                        }
                        if (vehicle.Photos != null && vehicle.Photos.Count > 0)
                        {
                            allPhotos.AddRange(vehicle.Photos);
                        }
                    }

                    bookingDtos.Add(new RentalBookingDto
                    {
                        Id = booking.Id,
                        RentalRequestId = booking.RentalRequestId,
                        RenterId = booking.RenterId,
                        RenterName = renter?.Email ?? "Unknown",
                        OwnerId = booking.OwnerId,
                        OwnerCompanyName = ownerProf?.CompanyName ?? "Unknown",
                        OwnerContactName = ownerProf?.ContactName ?? "",
                        OwnerPhone = ownerProf?.ContactPhone ?? "",
                        Vehicle = vehicle != null ? new VehicleBasicInfoDto
                        {
                            Id = vehicle.Id,
                            Registration = vehicle.Registration,
                            Make = vehicle.Make,
                            Model = vehicle.Model,
                            Year = vehicle.Year,
                            Type = vehicle.Type,
                            Capacity = vehicle.Capacity,
                            Status = vehicle.Status,
                            Photos = allPhotos
                        } : null,
                        StartDate = booking.StartDate,
                        EndDate = booking.EndDate,
                        DurationDays = booking.DurationDays,
                        TotalAmount = booking.TotalAmount,
                        PickupLocation = booking.PickupLocation,
                        DropoffLocation = booking.DropoffLocation,
                        Status = booking.Status,
                        BookedAt = booking.BookedAt
                    });
                }

                return Ok(bookingDtos.OrderByDescending(b => b.BookedAt));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching bookings", detail = ex.Message });
            }
        }
    }
}
