using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Repository;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TripCapturesController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public TripCapturesController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        // GET: api/TripCaptures
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TripCapture>>> GetTripCaptures()
        {
            return await _context.TripCaptures
                .Include(tc => tc.Marshal)
                .Include(tc => tc.Schedule)
                .Include(tc => tc.Vehicle)
                .OrderByDescending(tc => tc.CapturedAt)
                .ToListAsync();
        }

        // GET: api/TripCaptures/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<TripCapture>> GetTripCapture(Guid id)
        {
            var tripCapture = await _context.TripCaptures
                .Include(tc => tc.Marshal)
                .Include(tc => tc.Schedule)
                .Include(tc => tc.Vehicle)
                .FirstOrDefaultAsync(tc => tc.Id == id);

            if (tripCapture == null)
            {
                return NotFound(new { message = "Trip capture not found" });
            }

            return tripCapture;
        }

        // GET: api/TripCaptures/by-marshal/{marshalId}
        [HttpGet("by-marshal/{marshalId}")]
        public async Task<ActionResult<IEnumerable<TripCapture>>> GetByMarshal(Guid marshalId, [FromQuery] DateTime? date = null)
        {
            var targetDate = date ?? DateTime.Today;
            var startDate = targetDate.Date;
            var endDate = targetDate.Date.AddDays(1).AddTicks(-1);

            var captures = await _context.TripCaptures
                .Where(tc => tc.MarshalId == marshalId && tc.CapturedAt >= startDate && tc.CapturedAt <= endDate)
                .Include(tc => tc.Schedule)
                .Include(tc => tc.Vehicle)
                .OrderByDescending(tc => tc.CapturedAt)
                .ToListAsync();

            return Ok(captures);
        }

        // GET: api/TripCaptures/by-rank/{taxiRankId}
        [HttpGet("by-rank/{taxiRankId}")]
        public async Task<ActionResult<IEnumerable<TripCapture>>> GetByTaxiRank(Guid taxiRankId, [FromQuery] DateTime? date = null)
        {
            var targetDate = date ?? DateTime.Today;
            var startDate = targetDate.Date;
            var endDate = targetDate.Date.AddDays(1).AddTicks(-1);

            var captures = await _context.TripCaptures
                .Where(tc => tc.TaxiRankId == taxiRankId && tc.CapturedAt >= startDate && tc.CapturedAt <= endDate)
                .Include(tc => tc.Marshal)
                .Include(tc => tc.Schedule)
                .Include(tc => tc.Vehicle)
                .OrderByDescending(tc => tc.CapturedAt)
                .ToListAsync();

            return Ok(captures);
        }

        // POST: api/TripCaptures
        [HttpPost]
        public async Task<ActionResult<TripCapture>> CreateTripCapture(CreateTripCaptureDto dto)
        {
            // Validate marshal exists and has permission
            var marshal = await _context.QueueMarshals.FindAsync(dto.MarshalId);
            if (marshal == null || marshal.Status != "Active")
            {
                return BadRequest(new { message = "Invalid or inactive marshal" });
            }

            if (!marshal.Permissions.CanCaptureTrips)
            {
                return BadRequest(new { message = "Marshal does not have permission to capture trips" });
            }

            // Validate schedule exists and is active
            var schedule = await _context.TripSchedules.FindAsync(dto.ScheduleId);
            if (schedule == null || !schedule.IsActive)
            {
                return BadRequest(new { message = "Invalid or inactive schedule" });
            }

            // Validate vehicle exists
            var vehicle = await _context.Vehicles.FindAsync(dto.VehicleId);
            if (vehicle == null)
            {
                return BadRequest(new { message = "Invalid vehicle" });
            }

            var tripCapture = new TripCapture
            {
                Id = Guid.NewGuid(),
                MarshalId = dto.MarshalId,
                ScheduleId = dto.ScheduleId,
                VehicleId = dto.VehicleId,
                TaxiRankId = marshal.TaxiRankId,
                PassengerCount = dto.PassengerCount,
                FareCollected = dto.FareCollected,
                CapturedAt = dto.CapturedAt,
                Notes = dto.Notes,
                PhotoUri = dto.PhotoUri,
                Status = "Completed",
                CreatedAt = DateTime.UtcNow
            };

            _context.TripCaptures.Add(tripCapture);
            await _context.SaveChangesAsync();

            // Reload with related entities
            var created = await _context.TripCaptures
                .Include(tc => tc.Marshal)
                .Include(tc => tc.Schedule)
                .Include(tc => tc.Vehicle)
                .FirstOrDefaultAsync(tc => tc.Id == tripCapture.Id);

            return CreatedAtAction(nameof(GetTripCapture), new { id = created.Id }, created);
        }

        // PUT: api/TripCaptures/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<TripCapture>> UpdateTripCapture(Guid id, UpdateTripCaptureDto dto)
        {
            var tripCapture = await _context.TripCaptures.FindAsync(id);
            if (tripCapture == null)
                return NotFound(new { message = "Trip capture not found" });

            tripCapture.PassengerCount = dto.PassengerCount;
            tripCapture.FareCollected = dto.FareCollected;
            tripCapture.Notes = dto.Notes;
            tripCapture.Status = dto.Status;
            tripCapture.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Reload with related entities
            var updated = await _context.TripCaptures
                .Include(tc => tc.Marshal)
                .Include(tc => tc.Schedule)
                .Include(tc => tc.Vehicle)
                .FirstOrDefaultAsync(tc => tc.Id == id);

            return Ok(updated);
        }

        // DELETE: api/TripCaptures/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteTripCapture(Guid id)
        {
            var tripCapture = await _context.TripCaptures.FindAsync(id);
            if (tripCapture == null)
                return NotFound(new { message = "Trip capture not found" });

            // Soft delete by changing status
            tripCapture.Status = "Deleted";
            tripCapture.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Trip capture deleted successfully" });
        }

        // GET: api/TripCaptures/stats/{marshalId}
        [HttpGet("stats/{marshalId}")]
        public async Task<ActionResult<object>> GetMarshalTripStats(Guid marshalId, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
        {
            var start = startDate ?? DateTime.Today.AddDays(-30);
            var end = endDate ?? DateTime.Today.AddDays(1).AddTicks(-1);

            var captures = await _context.TripCaptures
                .Where(tc => tc.MarshalId == marshalId && tc.CapturedAt >= start && tc.CapturedAt <= end)
                .ToListAsync();

            var dailyStats = captures
                .GroupBy(tc => tc.CapturedAt.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    Trips = g.Count(),
                    Passengers = g.Sum(tc => tc.PassengerCount),
                    Fares = g.Sum(tc => tc.FareCollected)
                })
                .OrderBy(x => x.Date)
                .ToList();

            return Ok(new
            {
                totalTrips = captures.Count,
                totalPassengers = captures.Sum(tc => tc.PassengerCount),
                totalFares = captures.Sum(tc => tc.FareCollected),
                averageFare = captures.Any() ? captures.Average(tc => tc.FareCollected) : 0,
                dailyStats = dailyStats
            });
        }
    }

    public class CreateTripCaptureDto
    {
        public Guid MarshalId { get; set; }
        public Guid ScheduleId { get; set; }
        public Guid VehicleId { get; set; }
        public int PassengerCount { get; set; }
        public decimal FareCollected { get; set; }
        public DateTime CapturedAt { get; set; }
        public string Notes { get; set; }
        public string PhotoUri { get; set; }
    }

    public class UpdateTripCaptureDto
    {
        public int PassengerCount { get; set; }
        public decimal FareCollected { get; set; }
        public string Notes { get; set; }
        public string Status { get; set; }
    }
}
