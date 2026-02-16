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
using MzansiFleet.Application.Services;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RoadsideAssistanceController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;
        private readonly VehicleNotificationService _notificationService;

        public RoadsideAssistanceController(MzansiFleetDbContext context, VehicleNotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        // Simple test method
        [HttpGet("test")]
        public IActionResult Test()
        {
            return Ok("Roadside assistance controller is working!");
        }

        // POST: api/RoadsideAssistance/request
        [HttpPost("request")]
        [Authorize]
        public async Task<ActionResult<RoadsideAssistanceRequestDto>> CreateRequest([FromBody] CreateRoadsideAssistanceRequestDto dto)
        {
            // Get the authenticated user
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userEmailClaim = User.FindFirst(ClaimTypes.Email)?.Value;
            
            if (string.IsNullOrEmpty(userIdClaim))
            {
                return Unauthorized("User not authenticated");
            }

            // Get user details from database
            var user = await _context.Users.FindAsync(Guid.Parse(userIdClaim));
            if (user == null)
            {
                return BadRequest("User not found");
            }

            var userId = user.Id;
            var userName = user.Email ?? "Unknown User";
            var userRole = user.Role;
            var userPhone = user.Phone ?? "Not provided";

            // Get vehicle details if provided
            Vehicle vehicle = null;
            if (dto.VehicleId.HasValue)
            {
                vehicle = await _context.Vehicles.FindAsync(dto.VehicleId.Value);
            }

            // Get driver details if vehicle is provided
            DriverProfile driver = null;
            if (dto.VehicleId.HasValue)
            {
                driver = await _context.DriverProfiles
                    .FirstOrDefaultAsync(d => d.AssignedVehicleId == dto.VehicleId.Value);
            }

            var request = new RoadsideAssistanceRequest
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                UserName = userName,
                UserPhone = userPhone,
                UserRole = userRole,
                VehicleId = dto.VehicleId,
                VehicleRegistration = vehicle?.Registration,
                VehicleMake = vehicle?.Make,
                VehicleModel = vehicle?.Model,
                DriverId = driver?.Id,
                DriverName = driver?.Name,
                DriverPhone = driver?.Phone,
                AssistanceType = dto.AssistanceType,
                Location = dto.Location,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                IssueDescription = dto.IssueDescription,
                AdditionalNotes = dto.AdditionalNotes,
                Priority = dto.Priority,
                Status = "Pending",
                RequestedAt = DateTime.UtcNow
            };

            _context.RoadsideAssistanceRequests.Add(request);
            await _context.SaveChangesAsync();

            // Send notifications
            if (dto.VehicleId.HasValue)
            {
                // Notify owner about the roadside assistance request
                await _notificationService.NotifyRoadsideAssistanceRequested(
                    dto.VehicleId.Value,
                    dto.AssistanceType,
                    dto.Location,
                    dto.IssueDescription);
            }

            // Notify all service providers that offer roadside assistance
            await _notificationService.NotifyServiceProvidersRoadsideAssistance(
                dto.AssistanceType,
                dto.Location,
                request.Id);

            return CreatedAtAction(nameof(GetRequest), new { id = request.Id }, MapToDto(request));
        }

        // GET: api/RoadsideAssistance/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<RoadsideAssistanceRequestDto>> GetRequest(Guid id)
        {
            var request = await _context.RoadsideAssistanceRequests
                .Include(r => r.Vehicle)
                .Include(r => r.ServiceProvider)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null)
                return NotFound();

            return MapToDto(request);
        }

        // GET: api/RoadsideAssistance/pending
        [HttpGet("pending")]
        public async Task<ActionResult<IEnumerable<RoadsideAssistanceRequestDto>>> GetPendingRequests()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return BadRequest(new { error = "Invalid user identity", details = "User ID claim not found or invalid in JWT token" });
            }

            // Get the service provider profile for the current user
            var serviceProvider = await _context.ServiceProviderProfiles
                .FirstOrDefaultAsync(sp => sp.UserId == userId);

            if (serviceProvider == null)
            {
                return BadRequest(new { error = "Service provider profile not found", details = $"No service provider profile found for user ID: {userId}" });
            }

            // Get service types offered by this provider
            var serviceTypes = serviceProvider.ServiceTypes?
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(st => st.Trim().ToLower())
                .ToList() ?? new List<string>();

            // Filter pending requests by assistance type that matches provider's services
            var requests = await _context.RoadsideAssistanceRequests
                .Where(r => r.Status == "Pending" &&
                           serviceTypes.Contains(r.AssistanceType.ToLower()))
                .Include(r => r.Vehicle)
                .Include(r => r.ServiceProvider)
                .OrderByDescending(r => r.RequestedAt)
                .ToListAsync();

            return requests.Select(MapToDto).ToList();
        }

        // GET: api/RoadsideAssistance/assigned
        [HttpGet("assigned")]
        public async Task<ActionResult<IEnumerable<RoadsideAssistanceRequestDto>>> GetAssignedRequests()
        {
            var requests = await _context.RoadsideAssistanceRequests
                .Where(r => r.Status == "Assigned")
                .Include(r => r.Vehicle)
                .Include(r => r.ServiceProvider)
                .OrderByDescending(r => r.AssignedAt)
                .ToListAsync();

            return requests.Select(MapToDto).ToList();
        }

        // GET: api/RoadsideAssistance/my-requests
        [HttpGet("my-requests")]
        public async Task<ActionResult<IEnumerable<RoadsideAssistanceRequestDto>>> GetMyRequests()
        {
            // For now, return all requests. In a real app, you'd filter by the authenticated user
            var requests = await _context.RoadsideAssistanceRequests
                .Include(r => r.Vehicle)
                .Include(r => r.ServiceProvider)
                .OrderByDescending(r => r.RequestedAt)
                .ToListAsync();

            return requests.Select(MapToDto).ToList();
        }

        private RoadsideAssistanceRequestDto MapToDto(RoadsideAssistanceRequest request)
        {
            return new RoadsideAssistanceRequestDto
            {
                Id = request.Id,
                UserId = request.UserId,
                UserName = request.UserName,
                UserPhone = request.UserPhone,
                UserRole = request.UserRole,
                VehicleId = request.VehicleId,
                VehicleRegistration = request.VehicleRegistration,
                VehicleMake = request.VehicleMake,
                VehicleModel = request.VehicleModel,
                DriverId = request.DriverId,
                DriverName = request.DriverName,
                DriverPhone = request.DriverPhone,
                AssistanceType = request.AssistanceType,
                Location = request.Location,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                IssueDescription = request.IssueDescription,
                AdditionalNotes = request.AdditionalNotes,
                Status = request.Status,
                RequestedAt = request.RequestedAt,
                AssignedAt = request.AssignedAt,
                CompletedAt = request.CompletedAt,
                ServiceProviderId = request.ServiceProviderId,
                ServiceProviderName = request.ServiceProviderName,
                ServiceProviderPhone = request.ServiceProviderPhone,
                TechnicianName = request.TechnicianName,
                EstimatedArrivalTime = request.EstimatedArrivalTime,
                EstimatedCost = request.EstimatedCost,
                ActualCost = request.ActualCost,
                Priority = request.Priority
            };
        }
    }
}
