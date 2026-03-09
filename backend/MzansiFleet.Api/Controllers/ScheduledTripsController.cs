using Microsoft.AspNetCore.Authorization;
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
    [Authorize]
    public class ScheduledTripsController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public ScheduledTripsController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        // GET: api/ScheduledTrips/by-schedule/{scheduleId}
        [HttpGet("by-schedule/{scheduleId}")]
        public async Task<ActionResult<IEnumerable<ScheduledTrip>>> GetBySchedule(Guid scheduleId, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
        {
            var query = _context.ScheduledTrips
                .Include(st => st.TripSchedule)
                .Include(st => st.Vehicle)
                .Include(st => st.Driver)
                .Include(st => st.Marshal)
                .Where(st => st.TripScheduleId == scheduleId);

            if (startDate.HasValue)
            {
                query = query.Where(st => st.ScheduledDate >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                query = query.Where(st => st.ScheduledDate <= endDate.Value);
            }

            var scheduledTrips = await query
                .OrderBy(st => st.ScheduledDate)
                .ThenBy(st => st.ScheduledTime)
                .ToListAsync();

            return Ok(scheduledTrips);
        }

        // GET: api/ScheduledTrips/by-admin/{adminId}
        [HttpGet("by-admin/{adminId}")]
        public async Task<ActionResult<IEnumerable<ScheduledTrip>>> GetByAdmin(Guid adminId, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
        {
            var admin = await _context.TaxiRankAdmins.FindAsync(adminId);
            if (admin == null)
                return NotFound(new { message = "Admin not found" });

            var query = _context.ScheduledTrips
                .Include(st => st.TripSchedule)
                .Include(st => st.Vehicle)
                .Include(st => st.Driver)
                .Include(st => st.Marshal)
                .Where(st => st.TaxiRankId == admin.TaxiRankId);

            if (startDate.HasValue)
            {
                query = query.Where(st => st.ScheduledDate >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                query = query.Where(st => st.ScheduledDate <= endDate.Value);
            }

            var scheduledTrips = await query
                .OrderBy(st => st.ScheduledDate)
                .ThenBy(st => st.ScheduledTime)
                .ToListAsync();

            return Ok(scheduledTrips);
        }

        // POST: api/ScheduledTrips
        [HttpPost]
        public async Task<ActionResult<ScheduledTrip>> CreateScheduledTrip([FromBody] CreateScheduledTripDto dto)
        {
            var schedule = await _context.TripSchedules.FindAsync(dto.TripScheduleId);
            if (schedule == null)
                return NotFound(new { message = "Trip schedule not found" });

            var scheduledTrip = new ScheduledTrip
            {
                Id = Guid.NewGuid(),
                TripScheduleId = dto.TripScheduleId,
                TaxiRankId = schedule.TaxiRankId,
                TenantId = schedule.TenantId,
                ScheduledDate = dto.ScheduledDate,
                ScheduledTime = dto.ScheduledTime,
                VehicleId = dto.VehicleId,
                DriverId = dto.DriverId,
                MarshalId = dto.MarshalId,
                Status = "Scheduled",
                Notes = dto.Notes
            };

            _context.ScheduledTrips.Add(scheduledTrip);
            await _context.SaveChangesAsync();

            // Reload with related entities
            var created = await _context.ScheduledTrips
                .Include(st => st.TripSchedule)
                .Include(st => st.Vehicle)
                .Include(st => st.Driver)
                .Include(st => st.Marshal)
                .FirstOrDefaultAsync(st => st.Id == scheduledTrip.Id);

            return Ok(created);
        }

        // PUT: api/ScheduledTrips/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<ScheduledTrip>> UpdateScheduledTrip(Guid id, [FromBody] UpdateScheduledTripDto dto)
        {
            var scheduledTrip = await _context.ScheduledTrips.FindAsync(id);
            if (scheduledTrip == null)
                return NotFound(new { message = "Scheduled trip not found" });

            // Update properties
            scheduledTrip.ScheduledDate = dto.ScheduledDate;
            scheduledTrip.ScheduledTime = dto.ScheduledTime;
            scheduledTrip.VehicleId = dto.VehicleId;
            scheduledTrip.DriverId = dto.DriverId;
            scheduledTrip.MarshalId = dto.MarshalId;
            scheduledTrip.Notes = dto.Notes;
            scheduledTrip.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Reload with related entities
            var updated = await _context.ScheduledTrips
                .Include(st => st.TripSchedule)
                .Include(st => st.Vehicle)
                .Include(st => st.Driver)
                .Include(st => st.Marshal)
                .FirstOrDefaultAsync(st => st.Id == scheduledTrip.Id);

            return Ok(updated);
        }

        // DELETE: api/ScheduledTrips/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteScheduledTrip(Guid id)
        {
            var scheduledTrip = await _context.ScheduledTrips.FindAsync(id);
            if (scheduledTrip == null)
                return NotFound(new { message = "Scheduled trip not found" });

            // Soft delete by marking as cancelled
            scheduledTrip.Status = "Cancelled";
            scheduledTrip.CancelledAt = DateTime.UtcNow;
            scheduledTrip.CancellationReason = "Deleted by user";
            scheduledTrip.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Scheduled trip deleted successfully" });
        }

        // PUT: api/ScheduledTrips/{id}/cancel
        [HttpPut("{id}/cancel")]
        public async Task<ActionResult> CancelScheduledTrip(Guid id, [FromBody] CancelScheduledTripDto dto)
        {
            var scheduledTrip = await _context.ScheduledTrips.FindAsync(id);
            if (scheduledTrip == null)
                return NotFound(new { message = "Scheduled trip not found" });

            if (scheduledTrip.Status == "Completed")
                return BadRequest(new { message = "Cannot cancel a completed trip" });

            if (scheduledTrip.Status == "Cancelled")
                return BadRequest(new { message = "Trip is already cancelled" });

            scheduledTrip.Status = "Cancelled";
            scheduledTrip.CancelledAt = DateTime.UtcNow;
            scheduledTrip.CancellationReason = dto.Reason;
            scheduledTrip.CancelledBy = dto.CancelledBy;
            scheduledTrip.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Scheduled trip cancelled successfully" });
        }
    }

    public class CreateScheduledTripDto
    {
        public Guid TripScheduleId { get; set; }
        public DateTime ScheduledDate { get; set; }
        public TimeSpan ScheduledTime { get; set; }
        public Guid? VehicleId { get; set; }
        public Guid? DriverId { get; set; }
        public Guid? MarshalId { get; set; }
        public string? Notes { get; set; }
    }

    public class CancelScheduledTripDto
    {
        public string Reason { get; set; } = string.Empty;
        public string CancelledBy { get; set; } = string.Empty;
    }

    public class UpdateScheduledTripDto
    {
        public DateTime ScheduledDate { get; set; }
        public TimeSpan ScheduledTime { get; set; }
        public Guid? VehicleId { get; set; }
        public Guid? DriverId { get; set; }
        public Guid? MarshalId { get; set; }
        public string? Notes { get; set; }
    }
}
