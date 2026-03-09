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
            var scheduleIds = await _context.TripSchedules
                .Where(s => s.TaxiRankId == admin.TaxiRankId)
                .Select(s => s.Id)
                .ToListAsync();

            // Get all route vehicle assignments for these schedules
            var assignments = await _context.RouteVehicles
                .Include(rv => rv.Vehicle)
                .Include(rv => rv.TripSchedule)
                .Where(rv => scheduleIds.Contains(rv.TripScheduleId))
                .OrderBy(rv => rv.TripSchedule.RouteName)
                .ThenBy(rv => rv.Vehicle.Registration)
                .ToListAsync();

            return Ok(assignments);
        }

        // POST: api/RouteVehicle/assign/{userId}
        [HttpPost("assign/{userId}")]
        public async Task<ActionResult> AssignVehicles(Guid userId, [FromBody] AssignVehiclesRequest request)
        {
            // Get admin by userId to find their taxi rank
            var admin = await _context.TaxiRankAdmins
                .FirstOrDefaultAsync(a => a.UserId == userId);

            if (admin == null)
                return NotFound(new { message = "Admin not found for this user" });

            // Verify the schedule belongs to this admin's taxi rank
            var schedule = await _context.TripSchedules
                .FirstOrDefaultAsync(s => s.Id == request.TripScheduleId && s.TaxiRankId == admin.TaxiRankId);

            if (schedule == null)
                return NotFound(new { message = "Route not found or not accessible" });

            // Get existing assignments for this schedule
            var existingAssignments = await _context.RouteVehicles
                .Where(rv => rv.TripScheduleId == request.TripScheduleId && rv.IsActive)
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
                    TripScheduleId = request.TripScheduleId,
                    VehicleId = vehicleId,
                    AssignedAt = DateTime.UtcNow,
                    IsActive = true
                }).ToList();

                _context.RouteVehicles.AddRange(newAssignments);
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Vehicle assignments updated successfully" });
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
                .Where(rv => rv.TripScheduleId == routeId && rv.IsActive)
                .Select(rv => rv.Vehicle)
                .ToListAsync();

            return Ok(vehicles);
        }

        // GET: api/RouteVehicle/vehicle/{vehicleId}/routes
        [HttpGet("vehicle/{vehicleId}/routes")]
        public async Task<ActionResult<IEnumerable<TripSchedule>>> GetRoutesForVehicle(Guid vehicleId)
        {
            var routes = await _context.RouteVehicles
                .Include(rv => rv.TripSchedule)
                .Where(rv => rv.VehicleId == vehicleId && rv.IsActive)
                .Select(rv => rv.TripSchedule)
                .ToListAsync();

            return Ok(routes);
        }
    }

    public class AssignVehiclesRequest
    {
        public Guid TripScheduleId { get; set; }
        public List<Guid> VehicleIds { get; set; } = new List<Guid>();
    }
}
