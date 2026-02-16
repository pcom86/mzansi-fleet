using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
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
    [Authorize]
    public class TrackingDeviceController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public TrackingDeviceController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        // POST: api/TrackingDevice/request
        // Owner creates a tracking device installation request
        [HttpPost("request")]
        public async Task<ActionResult<TrackingDeviceRequestDto>> CreateRequest([FromBody] CreateTrackingDeviceRequestDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException());
            
            // Get owner profile
            var ownerProfile = await _context.OwnerProfiles.FirstOrDefaultAsync(o => o.UserId == userId);
            if (ownerProfile == null)
            {
                return BadRequest("Owner profile not found");
            }

            // Get vehicle details
            var vehicle = await _context.Vehicles.FindAsync(dto.VehicleId);
            if (vehicle == null)
            {
                return NotFound("Vehicle not found");
            }

            // Verify vehicle belongs to this owner's tenant
            var user = await _context.Users.FindAsync(userId);
            if (vehicle.TenantId != user!.TenantId)
            {
                return Forbid();
            }

            var request = new TrackingDeviceRequest
            {
                Id = Guid.NewGuid(),
                OwnerId = ownerProfile.Id,
                TenantId = user.TenantId,
                VehicleId = dto.VehicleId,
                VehicleRegistration = vehicle.Registration ?? "",
                VehicleMake = vehicle.Make ?? "",
                VehicleModel = vehicle.Model ?? "",
                VehicleYear = vehicle.Year,
                PreferredInstallationDate = dto.PreferredInstallationDate,
                InstallationLocation = dto.InstallationLocation,
                DeviceFeatures = dto.DeviceFeatures,
                SpecialRequirements = dto.SpecialRequirements,
                BudgetMin = dto.BudgetMin,
                BudgetMax = dto.BudgetMax,
                Status = "Open",
                CreatedAt = DateTime.UtcNow
            };

            _context.TrackingDeviceRequests.Add(request);
            await _context.SaveChangesAsync();

            return Ok(MapToDto(request, ownerProfile, user));
        }

        // GET: api/TrackingDevice/my-requests
        // Owner gets their tracking device requests
        [HttpGet("my-requests")]
        public async Task<ActionResult<IEnumerable<TrackingDeviceRequestDto>>> GetMyRequests()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException());
            
            var ownerProfile = await _context.OwnerProfiles.FirstOrDefaultAsync(o => o.UserId == userId);
            if (ownerProfile == null)
            {
                return BadRequest("Owner profile not found");
            }

            var user = await _context.Users.FindAsync(userId);

            var requests = await _context.TrackingDeviceRequests
                .Where(r => r.OwnerId == ownerProfile.Id)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            var dtos = requests.Select(r => MapToDto(r, ownerProfile, user!)).ToList();
            return Ok(dtos);
        }

        // GET: api/TrackingDevice/marketplace-requests
        // Service providers (tracking companies) browse open requests
        [HttpGet("marketplace-requests")]
        public async Task<ActionResult<IEnumerable<TrackingDeviceRequestDto>>> GetMarketplaceRequests()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException());
            
            // Get service provider profile
            var serviceProvider = await _context.ServiceProviderProfiles.FirstOrDefaultAsync(sp => sp.UserId == userId);
            if (serviceProvider == null)
            {
                return BadRequest("Service provider profile not found");
            }

            // Check if provider offers tracking services
            if (!serviceProvider.ServiceTypes.ToLower().Contains("tracking"))
            {
                return BadRequest("This service provider does not offer tracking device installation services");
            }

            var requests = await _context.TrackingDeviceRequests
                .Where(r => r.Status == "Open" || r.Status == "OfferReceived")
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            var dtos = new List<TrackingDeviceRequestDto>();
            foreach (var request in requests)
            {
                var owner = await _context.OwnerProfiles.FindAsync(request.OwnerId);
                var user = owner != null ? await _context.Users.FindAsync(owner.UserId) : null;
                
                var dto = MapToDto(request, owner!, user!);
                dto.HasMyOffer = await _context.TrackingDeviceOffers
                    .AnyAsync(o => o.TrackingDeviceRequestId == request.Id && o.ServiceProviderId == serviceProvider.Id);
                
                dtos.Add(dto);
            }

            return Ok(dtos);
        }

        // POST: api/TrackingDevice/offer
        // Service provider submits an offer
        [HttpPost("offer")]
        public async Task<ActionResult<TrackingDeviceOfferDto>> SubmitOffer([FromBody] CreateTrackingDeviceOfferDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException());
            
            var serviceProvider = await _context.ServiceProviderProfiles.FirstOrDefaultAsync(sp => sp.UserId == userId);
            if (serviceProvider == null)
            {
                return BadRequest("Service provider profile not found");
            }

            // Verify provider offers tracking services
            if (!serviceProvider.ServiceTypes.Contains("Tracking"))
            {
                return BadRequest("This service provider does not offer tracking device installation services");
            }

            // Check if request exists and is open
            var request = await _context.TrackingDeviceRequests.FindAsync(dto.TrackingDeviceRequestId);
            if (request == null)
            {
                return NotFound("Request not found");
            }

            if (request.Status != "Open" && request.Status != "OfferReceived")
            {
                return BadRequest("This request is no longer accepting offers");
            }

            // Check if provider already submitted an offer
            var existingOffer = await _context.TrackingDeviceOffers
                .FirstOrDefaultAsync(o => o.TrackingDeviceRequestId == dto.TrackingDeviceRequestId && 
                                         o.ServiceProviderId == serviceProvider.Id);
            if (existingOffer != null)
            {
                return BadRequest("You have already submitted an offer for this request");
            }

            var offer = new TrackingDeviceOffer
            {
                Id = Guid.NewGuid(),
                TrackingDeviceRequestId = dto.TrackingDeviceRequestId,
                ServiceProviderId = serviceProvider.Id,
                DeviceBrand = dto.DeviceBrand,
                DeviceModel = dto.DeviceModel,
                DeviceFeatures = dto.DeviceFeatures,
                InstallationDetails = dto.InstallationDetails,
                DeviceCost = dto.DeviceCost,
                InstallationCost = dto.InstallationCost,
                MonthlySubscriptionFee = dto.MonthlySubscriptionFee,
                TotalUpfrontCost = dto.DeviceCost + dto.InstallationCost,
                WarrantyPeriod = dto.WarrantyPeriod,
                SupportDetails = dto.SupportDetails,
                AvailableFrom = dto.AvailableFrom,
                EstimatedInstallationTime = dto.EstimatedInstallationTime,
                AdditionalNotes = dto.AdditionalNotes,
                Status = "Pending",
                SubmittedAt = DateTime.UtcNow
            };

            _context.TrackingDeviceOffers.Add(offer);
            
            // Update request status and offer count
            request.OfferCount = await _context.TrackingDeviceOffers
                .CountAsync(o => o.TrackingDeviceRequestId == request.Id) + 1;
            request.Status = "OfferReceived";
            request.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();

            return Ok(MapOfferToDto(offer, serviceProvider));
        }

        // GET: api/TrackingDevice/request/{requestId}/offers
        // Owner gets offers for their request
        [HttpGet("request/{requestId}/offers")]
        public async Task<ActionResult<IEnumerable<TrackingDeviceOfferDto>>> GetOffersForRequest(Guid requestId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException());
            
            var ownerProfile = await _context.OwnerProfiles.FirstOrDefaultAsync(o => o.UserId == userId);
            if (ownerProfile == null)
            {
                return BadRequest("Owner profile not found");
            }

            var request = await _context.TrackingDeviceRequests.FindAsync(requestId);
            if (request == null)
            {
                return NotFound("Request not found");
            }

            if (request.OwnerId != ownerProfile.Id)
            {
                return Forbid();
            }

            var offers = await _context.TrackingDeviceOffers
                .Where(o => o.TrackingDeviceRequestId == requestId)
                .OrderByDescending(o => o.SubmittedAt)
                .ToListAsync();

            var dtos = new List<TrackingDeviceOfferDto>();
            foreach (var offer in offers)
            {
                var provider = await _context.ServiceProviderProfiles.FindAsync(offer.ServiceProviderId);
                if (provider != null)
                {
                    dtos.Add(MapOfferToDto(offer, provider));
                }
            }

            return Ok(dtos);
        }

        // GET: api/TrackingDevice/my-offers
        // Service provider gets their submitted offers
        [HttpGet("my-offers")]
        public async Task<ActionResult<IEnumerable<TrackingDeviceOfferDto>>> GetMyOffers()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException());
            
            var serviceProvider = await _context.ServiceProviderProfiles.FirstOrDefaultAsync(sp => sp.UserId == userId);
            if (serviceProvider == null)
            {
                return BadRequest("Service provider profile not found");
            }

            var offers = await _context.TrackingDeviceOffers
                .Where(o => o.ServiceProviderId == serviceProvider.Id)
                .OrderByDescending(o => o.SubmittedAt)
                .ToListAsync();

            var dtos = offers.Select(o => MapOfferToDto(o, serviceProvider)).ToList();
            return Ok(dtos);
        }

        // POST: api/TrackingDevice/accept-offer/{offerId}
        // Owner accepts an offer
        [HttpPost("accept-offer/{offerId}")]
        public async Task<ActionResult> AcceptOffer(Guid offerId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException());
            
            var ownerProfile = await _context.OwnerProfiles.FirstOrDefaultAsync(o => o.UserId == userId);
            if (ownerProfile == null)
            {
                return BadRequest("Owner profile not found");
            }

            var offer = await _context.TrackingDeviceOffers.FindAsync(offerId);
            if (offer == null)
            {
                return NotFound("Offer not found");
            }

            var request = await _context.TrackingDeviceRequests.FindAsync(offer.TrackingDeviceRequestId);
            if (request == null)
            {
                return NotFound("Request not found");
            }

            if (request.OwnerId != ownerProfile.Id)
            {
                return Forbid();
            }

            // Update offer status
            offer.Status = "Accepted";
            offer.ResponsedAt = DateTime.UtcNow;

            // Update request status
            request.Status = "Accepted";
            request.UpdatedAt = DateTime.UtcNow;

            // Reject other pending offers
            var otherOffers = await _context.TrackingDeviceOffers
                .Where(o => o.TrackingDeviceRequestId == request.Id && o.Id != offerId && o.Status == "Pending")
                .ToListAsync();
            
            foreach (var otherOffer in otherOffers)
            {
                otherOffer.Status = "Rejected";
                otherOffer.ResponsedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Offer accepted successfully" });
        }

        // DELETE: api/TrackingDevice/request/{requestId}
        // Owner cancels/deletes their request
        [HttpDelete("request/{requestId}")]
        public async Task<ActionResult> DeleteRequest(Guid requestId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException());
            
            var ownerProfile = await _context.OwnerProfiles.FirstOrDefaultAsync(o => o.UserId == userId);
            if (ownerProfile == null)
            {
                return BadRequest("Owner profile not found");
            }

            var request = await _context.TrackingDeviceRequests.FindAsync(requestId);
            if (request == null)
            {
                return NotFound("Request not found");
            }

            if (request.OwnerId != ownerProfile.Id)
            {
                return Forbid();
            }

            _context.TrackingDeviceRequests.Remove(request);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Request deleted successfully" });
        }

        // Helper methods
        private TrackingDeviceRequestDto MapToDto(TrackingDeviceRequest request, OwnerProfile owner, User user)
        {
            return new TrackingDeviceRequestDto
            {
                Id = request.Id,
                OwnerId = request.OwnerId,
                OwnerName = owner.CompanyName,
                OwnerEmail = owner.ContactEmail,
                OwnerPhone = owner.ContactPhone,
                TenantId = request.TenantId,
                VehicleId = request.VehicleId,
                VehicleRegistration = request.VehicleRegistration,
                VehicleMake = request.VehicleMake,
                VehicleModel = request.VehicleModel,
                VehicleYear = request.VehicleYear,
                PreferredInstallationDate = request.PreferredInstallationDate,
                InstallationLocation = request.InstallationLocation,
                DeviceFeatures = request.DeviceFeatures,
                SpecialRequirements = request.SpecialRequirements,
                BudgetMin = request.BudgetMin,
                BudgetMax = request.BudgetMax,
                Status = request.Status,
                CreatedAt = request.CreatedAt,
                OfferCount = request.OfferCount,
                HasMyOffer = false
            };
        }

        private TrackingDeviceOfferDto MapOfferToDto(TrackingDeviceOffer offer, ServiceProviderProfile provider)
        {
            return new TrackingDeviceOfferDto
            {
                Id = offer.Id,
                TrackingDeviceRequestId = offer.TrackingDeviceRequestId,
                ServiceProviderId = offer.ServiceProviderId,
                ServiceProviderName = provider.BusinessName,
                ServiceProviderPhone = provider.Phone,
                ServiceProviderEmail = provider.Email,
                ServiceProviderAddress = provider.Address,
                ServiceProviderRating = provider.Rating,
                ServiceProviderReviews = provider.TotalReviews,
                DeviceBrand = offer.DeviceBrand,
                DeviceModel = offer.DeviceModel,
                DeviceFeatures = offer.DeviceFeatures,
                InstallationDetails = offer.InstallationDetails,
                DeviceCost = offer.DeviceCost,
                InstallationCost = offer.InstallationCost,
                MonthlySubscriptionFee = offer.MonthlySubscriptionFee,
                TotalUpfrontCost = offer.TotalUpfrontCost,
                WarrantyPeriod = offer.WarrantyPeriod,
                SupportDetails = offer.SupportDetails,
                AvailableFrom = offer.AvailableFrom,
                EstimatedInstallationTime = offer.EstimatedInstallationTime,
                AdditionalNotes = offer.AdditionalNotes,
                Status = offer.Status,
                SubmittedAt = offer.SubmittedAt
            };
        }
    }
}
