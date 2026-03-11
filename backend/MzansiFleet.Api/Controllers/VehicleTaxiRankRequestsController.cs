using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Repository;
using System;
using System.Linq;

namespace MzansiFleet.Api.Controllers
{
    public class CreateVehicleLinkRequestDto
    {
        public Guid VehicleId { get; set; }
        public Guid TaxiRankId { get; set; }
        public Guid RequestedByUserId { get; set; }
        public string? RequestedByName { get; set; }
        public string? VehicleRegistration { get; set; }
        public string? TaxiRankName { get; set; }
        public string? Notes { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class VehicleTaxiRankRequestsController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public VehicleTaxiRankRequestsController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        // Get all requests for a taxi rank
        [HttpGet("taxirank/{taxiRankId}")]
        public IActionResult GetByTaxiRank(Guid taxiRankId, [FromQuery] string status = null)
        {
            try
            {
                var query = _context.VehicleTaxiRankRequests
                    .Where(r => r.TaxiRankId == taxiRankId);

                if (!string.IsNullOrEmpty(status))
                {
                    query = query.Where(r => r.Status == status);
                }

                var requests = query.OrderByDescending(r => r.RequestedAt).ToList();
                return Ok(requests);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Get all requests by a user (owner)
        [HttpGet("user/{userId}")]
        public IActionResult GetByUser(Guid userId)
        {
            try
            {
                var requests = _context.VehicleTaxiRankRequests
                    .Where(r => r.RequestedByUserId == userId)
                    .OrderByDescending(r => r.RequestedAt)
                    .ToList();
                return Ok(requests);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Get pending requests count for a taxi rank
        [HttpGet("taxirank/{taxiRankId}/pending-count")]
        public IActionResult GetPendingCount(Guid taxiRankId)
        {
            try
            {
                var count = _context.VehicleTaxiRankRequests
                    .Count(r => r.TaxiRankId == taxiRankId && r.Status == "Pending");
                return Ok(new { count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Create a new request (from owner)
        [HttpPost]
        public IActionResult CreateRequest([FromBody] CreateVehicleLinkRequestDto dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new { error = "Request data is required" });
                }

                // Check if there's already a pending request for this vehicle and taxi rank
                var existingRequest = _context.VehicleTaxiRankRequests
                    .FirstOrDefault(r => r.VehicleId == dto.VehicleId 
                        && r.TaxiRankId == dto.TaxiRankId 
                        && r.Status == "Pending");

                if (existingRequest != null)
                {
                    return BadRequest(new { error = "A pending request already exists for this vehicle and taxi rank" });
                }

                // Check if vehicle is already linked to this taxi rank
                var vehicle = _context.Vehicles.FirstOrDefault(v => v.Id == dto.VehicleId);
                if (vehicle != null && vehicle.TaxiRankId == dto.TaxiRankId)
                {
                    return BadRequest(new { error = "Vehicle is already linked to this taxi rank" });
                }

                var request = new VehicleTaxiRankRequest
                {
                    Id = Guid.NewGuid(),
                    VehicleId = dto.VehicleId,
                    TaxiRankId = dto.TaxiRankId,
                    RequestedByUserId = dto.RequestedByUserId,
                    RequestedByName = dto.RequestedByName,
                    VehicleRegistration = dto.VehicleRegistration,
                    TaxiRankName = dto.TaxiRankName,
                    Notes = dto.Notes,
                    Status = "Pending",
                    RequestedAt = DateTime.UtcNow
                };

                _context.VehicleTaxiRankRequests.Add(request);
                _context.SaveChanges();

                return Ok(new { message = "Request submitted successfully", request });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, details = ex.InnerException?.Message });
            }
        }

        // Approve a request (from taxi rank manager)
        [HttpPost("{requestId}/approve")]
        public IActionResult ApproveRequest(Guid requestId, [FromBody] ApprovalRequest approval)
        {
            try
            {
                var request = _context.VehicleTaxiRankRequests.FirstOrDefault(r => r.Id == requestId);
                if (request == null)
                {
                    return NotFound(new { error = "Request not found" });
                }

                if (request.Status != "Pending")
                {
                    return BadRequest(new { error = "Request has already been reviewed" });
                }

                // Update the vehicle's TaxiRankId
                var vehicle = _context.Vehicles.FirstOrDefault(v => v.Id == request.VehicleId);
                if (vehicle == null)
                {
                    return NotFound(new { error = "Vehicle not found" });
                }

                vehicle.TaxiRankId = request.TaxiRankId;

                // Also create/reactivate VehicleTaxiRank junction record
                var existingJunction = _context.VehicleTaxiRanks
                    .FirstOrDefault(vtr => vtr.VehicleId == request.VehicleId && vtr.TaxiRankId == request.TaxiRankId);
                if (existingJunction != null)
                {
                    existingJunction.IsActive = true;
                    existingJunction.RemovedDate = null;
                    existingJunction.AssignedDate = DateTime.UtcNow;
                }
                else
                {
                    _context.VehicleTaxiRanks.Add(new VehicleTaxiRank
                    {
                        Id = Guid.NewGuid(),
                        VehicleId = request.VehicleId,
                        TaxiRankId = request.TaxiRankId,
                        AssignedDate = DateTime.UtcNow,
                        IsActive = true
                    });
                }

                // Update the request
                request.Status = "Approved";
                request.ReviewedAt = DateTime.UtcNow;
                request.ReviewedByUserId = approval.ReviewedByUserId;
                request.ReviewedByName = approval.ReviewedByName;

                _context.SaveChanges();

                return Ok(new { message = "Request approved successfully", request, vehicle });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Reject a request (from taxi rank manager)
        [HttpPost("{requestId}/reject")]
        public IActionResult RejectRequest(Guid requestId, [FromBody] RejectionRequest rejection)
        {
            try
            {
                var request = _context.VehicleTaxiRankRequests.FirstOrDefault(r => r.Id == requestId);
                if (request == null)
                {
                    return NotFound(new { error = "Request not found" });
                }

                if (request.Status != "Pending")
                {
                    return BadRequest(new { error = "Request has already been reviewed" });
                }

                request.Status = "Rejected";
                request.ReviewedAt = DateTime.UtcNow;
                request.ReviewedByUserId = rejection.ReviewedByUserId;
                request.ReviewedByName = rejection.ReviewedByName;
                request.RejectionReason = rejection.RejectionReason;

                _context.SaveChanges();

                return Ok(new { message = "Request rejected", request });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Search vehicles by registration (for taxi rank manager)
        [HttpGet("search")]
        public IActionResult SearchVehicles([FromQuery] string registration, [FromQuery] Guid? tenantId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(registration))
                {
                    return BadRequest(new { error = "Registration is required" });
                }

                var query = _context.Vehicles.AsQueryable();

                if (tenantId.HasValue)
                {
                    query = query.Where(v => v.TenantId == tenantId.Value);
                }

                var vehicles = query
                    .Where(v => v.Registration.ToLower().Contains(registration.ToLower()))
                    .Take(20)
                    .ToList();

                return Ok(vehicles);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }

    public class ApprovalRequest
    {
        public Guid ReviewedByUserId { get; set; }
        public string ReviewedByName { get; set; }
    }

    public class RejectionRequest
    {
        public Guid ReviewedByUserId { get; set; }
        public string ReviewedByName { get; set; }
        public string RejectionReason { get; set; }
    }
}

