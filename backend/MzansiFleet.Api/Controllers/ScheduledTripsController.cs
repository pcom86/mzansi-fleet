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

        // GET: api/ScheduledTrips/by-rank?taxiRankId={id}&date={date}
        // Public endpoint for riders to browse available trips
        [HttpGet("by-rank")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<object>>> GetByRank([FromQuery] Guid taxiRankId, [FromQuery] DateTime? date = null)
        {
            if (taxiRankId == Guid.Empty)
                return BadRequest(new { message = "TaxiRankId is required" });

            var targetDate = date ?? DateTime.UtcNow.Date;
            
            var query = _context.ScheduledTrips
                .Include(st => st.Route)
                .Include(st => st.Vehicle)
                .Include(st => st.Driver)
                .Include(st => st.Marshal)
                .Where(st => st.TaxiRankId == taxiRankId 
                    && st.ScheduledDate.Date == targetDate.Date
                    && st.Status != "Cancelled");

            var scheduledTrips = await query
                .OrderBy(st => st.ScheduledTime)
                .ToListAsync();

            // Get bookings for these trips to calculate available seats
            var tripIds = scheduledTrips.Select(st => st.Id).ToList();
            var bookings = await _context.ScheduledTripBookings
                .Where(b => tripIds.Contains(b.RouteId) && b.Status != "Cancelled")
                .ToListAsync();

            var result = scheduledTrips.Select(st => {
                var tripBookings = bookings.Where(b => b.RouteId == st.Id).ToList();
                var bookedSeats = tripBookings.Sum(b => b.SeatsBooked);
                var maxPassengers = st.Route?.MaxPassengers ?? 16;
                var seatNumbers = Enumerable.Range(1, maxPassengers).ToList();
                var bookedSeatNumbers = tripBookings.SelectMany(b => b.SeatNumbers ?? new List<int>()).ToList();

                return new
                {
                    st.Id,
                    st.RouteId,
                    st.TaxiRankId,
                    st.TenantId,
                    st.ScheduledDate,
                    st.ScheduledTime,
                    st.VehicleId,
                    st.DriverId,
                    st.MarshalId,
                    st.Status,
                    st.Notes,
                    st.CreatedAt,
                    st.UpdatedAt,
                    Route = st.Route == null ? null : new
                    {
                        st.Route.Id,
                        st.Route.RouteName,
                        st.Route.DepartureStation,
                        st.Route.DestinationStation,
                        st.Route.StandardFare,
                        st.Route.MaxPassengers,
                        st.Route.ExpectedDurationMinutes
                    },
                    Vehicle = st.Vehicle == null ? null : new
                    {
                        st.Vehicle.Id,
                        st.Vehicle.Registration,
                        st.Vehicle.Make,
                        st.Vehicle.Model
                    },
                    Driver = st.Driver == null ? null : new
                    {
                        st.Driver.Id,
                        Name = st.Driver.Name ?? "Unknown Driver"
                    },
                    Marshal = st.Marshal == null ? null : new
                    {
                        st.Marshal.Id,
                        st.Marshal.FullName
                    },
                    AvailableSeats = maxPassengers - bookedSeats,
                    BookedSeats = bookedSeatNumbers
                };
            });

            return Ok(result);
        }

        // GET: api/ScheduledTrips/by-schedule/{scheduleId}
        [HttpGet("by-schedule/{scheduleId}")]
        public async Task<ActionResult<IEnumerable<ScheduledTrip>>> GetBySchedule(Guid scheduleId, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
        {
            var query = _context.ScheduledTrips
                .Include(st => st.Route)
                .Include(st => st.Vehicle)
                .Include(st => st.Driver)
                .Include(st => st.Marshal)
                .Where(st => st.RouteId == scheduleId);

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
                .Include(st => st.Route)
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
            var schedule = await _context.Routes.FindAsync(dto.RouteId);
            if (schedule == null)
                return NotFound(new { message = "Trip schedule not found" });

            var scheduledTrip = new ScheduledTrip
            {
                Id = Guid.NewGuid(),
                RouteId = dto.RouteId,
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
                .Include(st => st.Route)
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
                .Include(st => st.Route)
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
        public Guid RouteId { get; set; }
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

