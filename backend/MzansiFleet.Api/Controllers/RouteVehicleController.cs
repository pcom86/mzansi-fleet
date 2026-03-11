using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RouteVehicleController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public RouteVehicleController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        // GET: api/RouteVehicle/assignments/{userId}
        [HttpGet("assignments/{userId}")]
        public async Task<ActionResult<IEnumerable<RouteVehicle>>> GetAssignments(Guid userId)
        {
            // Get admin by userId to find their taxi rank
            var admin = await _context.TaxiRankAdmins
                .FirstOrDefaultAsync(a => a.UserId == userId);

            if (admin == null)
                return NotFound(new { message = "Admin not found for this user" });

            // Get all schedules for this admin's taxi rank
            var scheduleIds = await _context.Routes
                .Where(s => s.TaxiRankId == admin.TaxiRankId)
                .Select(s => s.Id)
                .ToListAsync();

            // Get all route vehicle assignments for these schedules
            var assignments = await _context.RouteVehicles
                .Include(rv => rv.Vehicle)
                .Include(rv => rv.Route)
                .Where(rv => scheduleIds.Contains(rv.RouteId))
                .OrderBy(rv => rv.Route.RouteName)
                .ThenBy(rv => rv.Vehicle.Registration)
                .ToListAsync();

            return Ok(assignments);
        }

        // POST: api/RouteVehicle/assign/{userId}
        [HttpPost("assign/{userId}")]
        public async Task<ActionResult> AssignVehicles(Guid userId, [FromBody] AssignVehiclesRequest request)
        {
            try
            {
                // Get admin by userId to find their taxi rank
                var admin = await _context.TaxiRankAdmins
                    .FirstOrDefaultAsync(a => a.UserId == userId);

                if (admin == null)
                    return NotFound(new { message = "Admin not found for this user" });

                // Verify the schedule belongs to this admin's taxi rank
                var schedule = await _context.Routes
                    .FirstOrDefaultAsync(s => s.Id == request.RouteId && s.TaxiRankId == admin.TaxiRankId);

                if (schedule == null)
                    return NotFound(new { message = "Route not found or not accessible", routeId = request.RouteId, taxiRankId = admin.TaxiRankId });

                // Get existing assignments for this schedule
                var existingAssignments = await _context.RouteVehicles
                    .Where(rv => rv.RouteId == request.RouteId && rv.IsActive)
                    .ToListAsync();

                // Deactivate all existing assignments
                foreach (var assignment in existingAssignments)
                {
                    assignment.IsActive = false;
                }

                // Create new assignments for selected vehicles
                if (request.VehicleIds != null && request.VehicleIds.Count > 0)
                {
                    // Verify all vehicles exist
                    var vehicleIds = await _context.Vehicles
                        .Where(v => request.VehicleIds.Contains(v.Id))
                        .Select(v => v.Id)
                        .ToListAsync();

                    var newAssignments = vehicleIds.Select(vehicleId => new RouteVehicle
                    {
                        Id = Guid.NewGuid(),
                        RouteId = request.RouteId,
                        VehicleId = vehicleId,
                        AssignedAt = DateTime.UtcNow,
                        IsActive = true
                    }).ToList();

                    _context.RouteVehicles.AddRange(newAssignments);
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Vehicle assignments updated successfully" });
            }
            catch (Exception ex)
            {
                var innerMsg = ex.InnerException?.Message ?? "No inner exception";
                var innerInnerMsg = ex.InnerException?.InnerException?.Message ?? "No inner-inner exception";
                return StatusCode(500, new { 
                    error = "Failed to save assignments",
                    message = ex.Message,
                    innerException = innerMsg,
                    innerInnerException = innerInnerMsg
                });
            }
        }

        // DELETE: api/RouteVehicle/{assignmentId}
        [HttpDelete("{assignmentId}")]
        public async Task<ActionResult> RemoveAssignment(Guid assignmentId)
        {
            var assignment = await _context.RouteVehicles
                .FirstOrDefaultAsync(rv => rv.Id == assignmentId);

            if (assignment == null)
                return NotFound(new { message = "Assignment not found" });

            // Soft delete by setting IsActive to false
            assignment.IsActive = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Assignment removed successfully" });
        }

        // GET: api/RouteVehicle/route/{routeId}/vehicles
        [HttpGet("route/{routeId}/vehicles")]
        public async Task<ActionResult<IEnumerable<Vehicle>>> GetVehiclesForRoute(Guid routeId)
        {
            var vehicles = await _context.RouteVehicles
                .Include(rv => rv.Vehicle)
                .Where(rv => rv.RouteId == routeId && rv.IsActive)
                .Select(rv => rv.Vehicle)
                .ToListAsync();

            return Ok(vehicles);
        }

        // GET: api/RouteVehicle/vehicle/{vehicleId}/routes
        [HttpGet("vehicle/{vehicleId}/routes")]
        public async Task<ActionResult<IEnumerable<Route>>> GetRoutesForVehicle(Guid vehicleId)
        {
            var routes = await _context.RouteVehicles
                .Include(rv => rv.Route)
                .Where(rv => rv.VehicleId == vehicleId && rv.IsActive)
                .Select(rv => rv.Route)
                .ToListAsync();

            return Ok(routes);
        }
    }

    public class AssignVehiclesRequest
    {
        public Guid RouteId { get; set; }
        public List<Guid> VehicleIds { get; set; } = new List<Guid>();
    }
}

