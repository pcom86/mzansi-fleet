#nullable enable
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
    public class DriverBehaviorController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public DriverBehaviorController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        // POST: api/DriverBehavior
        [HttpPost]
        public async Task<ActionResult<DriverBehaviorEvent>> RecordEvent([FromBody] RecordBehaviorEventDto dto)
        {
            var driver = await _context.DriverProfiles
                .Include(d => d.User)
                .FirstOrDefaultAsync(d => d.Id == dto.DriverId);
            if (driver == null) return NotFound(new { message = "Driver not found" });

            var ev = new DriverBehaviorEvent
            {
                Id = Guid.NewGuid(),
                DriverId = dto.DriverId,
                VehicleId = dto.VehicleId,
                ReportedById = dto.ReportedById,
                TenantId = dto.TenantId,
                Category = dto.Category,
                Severity = dto.Severity ?? "Medium",
                Description = dto.Description ?? "",
                Location = dto.Location,
                PointsImpact = dto.PointsImpact,
                EventType = dto.EventType ?? "Negative",
                EventDate = dto.EventDate ?? DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                Notes = dto.Notes,
                EvidenceUrl = dto.EvidenceUrl,
                IsResolved = false
            };

            _context.DriverBehaviorEvents.Add(ev);
            await _context.SaveChangesAsync();

            // Notify fleet owners for any negative behavior event.
            if (IsNegativeBehaviorEvent(ev))
            {
                await NotifyOwnersOfBehaviorAlertAsync(ev, driver);
            }

            return CreatedAtAction(nameof(GetById), new { id = ev.Id }, ev);
        }

        // GET: api/DriverBehavior/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<DriverBehaviorEvent>> GetById(Guid id)
        {
            var ev = await _context.DriverBehaviorEvents
                .Include(e => e.Driver)
                .Include(e => e.Vehicle)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (ev == null) return NotFound();
            return Ok(ev);
        }

        // GET: api/DriverBehavior/driver/{driverId}
        [HttpGet("driver/{driverId}")]
        public async Task<ActionResult<IEnumerable<DriverBehaviorEvent>>> GetByDriver(Guid driverId, [FromQuery] int limit = 50)
        {
            var events = await _context.DriverBehaviorEvents
                .Where(e => e.DriverId == driverId)
                .OrderByDescending(e => e.EventDate)
                .Take(limit)
                .ToListAsync();

            return Ok(events);
        }

        // GET: api/DriverBehavior/tenant/{tenantId}
        [HttpGet("tenant/{tenantId}")]
        public async Task<ActionResult<IEnumerable<DriverBehaviorEvent>>> GetByTenant(Guid tenantId, [FromQuery] int limit = 100)
        {
            var events = await _context.DriverBehaviorEvents
                .Where(e => e.TenantId == tenantId)
                .Include(e => e.Driver)
                .Include(e => e.Vehicle)
                .OrderByDescending(e => e.EventDate)
                .Take(limit)
                .ToListAsync();

            return Ok(events);
        }

        // GET: api/DriverBehavior/scoreboard/{tenantId}
        [HttpGet("scoreboard/{tenantId}")]
        public async Task<ActionResult<IEnumerable<DriverScoreDto>>> GetScoreboard(Guid tenantId)
        {
            // Get all drivers for this tenant via user → tenant relationship
            var drivers = await _context.DriverProfiles
                .Include(d => d.User)
                .Where(d => d.User != null && d.User.TenantId == tenantId)
                .ToListAsync();

            if (!drivers.Any())
            {
                // Fallback: get all drivers (owner may not have strict tenant linkage)
                drivers = await _context.DriverProfiles
                    .Include(d => d.User)
                    .ToListAsync();
            }

            var driverIds = drivers.Select(d => d.Id).ToList();

            // Get all events for these drivers
            var events = await _context.DriverBehaviorEvents
                .Where(e => driverIds.Contains(e.DriverId))
                .ToListAsync();

            var now = DateTime.UtcNow;
            var thirtyDaysAgo = now.AddDays(-30);
            var ninetyDaysAgo = now.AddDays(-90);

            var scoreboard = drivers.Select(driver =>
            {
                var driverEvents = events.Where(e => e.DriverId == driver.Id).ToList();
                var recent30 = driverEvents.Where(e => e.EventDate >= thirtyDaysAgo).ToList();
                var recent90 = driverEvents.Where(e => e.EventDate >= ninetyDaysAgo).ToList();

                // Scoring: Start at 100, apply point impacts
                const int baseScore = 100;
                var totalImpact = recent90.Sum(e => e.PointsImpact);
                var score = Math.Max(0, Math.Min(100, baseScore + totalImpact));

                var positiveCount = driverEvents.Count(e => e.EventType == "Positive");
                var negativeCount = driverEvents.Count(e => e.EventType == "Negative");
                var unresolvedCount = driverEvents.Count(e => !e.IsResolved && e.EventType == "Negative");

                // Grade based on score
                string grade;
                if (score >= 90) grade = "A";
                else if (score >= 75) grade = "B";
                else if (score >= 60) grade = "C";
                else if (score >= 40) grade = "D";
                else grade = "F";

                // Trend: compare 30-day score vs 90-day score
                var impact30 = recent30.Sum(e => e.PointsImpact);
                var impact90minus30 = recent90.Where(e => e.EventDate < thirtyDaysAgo).Sum(e => e.PointsImpact);
                string trend = impact30 > impact90minus30 ? "Improving" : impact30 < impact90minus30 ? "Declining" : "Stable";

                return new DriverScoreDto
                {
                    DriverId = driver.Id,
                    DriverName = driver.Name ?? "Unknown",
                    Phone = driver.Phone,
                    Email = driver.Email,
                    PhotoUrl = driver.PhotoUrl,
                    AssignedVehicleId = driver.AssignedVehicleId,
                    Score = score,
                    Grade = grade,
                    Trend = trend,
                    TotalEvents = driverEvents.Count,
                    PositiveEvents = positiveCount,
                    NegativeEvents = negativeCount,
                    UnresolvedEvents = unresolvedCount,
                    Last30DaysEvents = recent30.Count,
                    LastEventDate = driverEvents.OrderByDescending(e => e.EventDate).FirstOrDefault()?.EventDate,
                    TopCategory = driverEvents
                        .Where(e => e.EventType == "Negative")
                        .GroupBy(e => e.Category)
                        .OrderByDescending(g => g.Count())
                        .FirstOrDefault()?.Key
                };
            })
            .OrderByDescending(d => d.Score)
            .ToList();

            return Ok(scoreboard);
        }

        // PUT: api/DriverBehavior/{id}/resolve
        [HttpPut("{id}/resolve")]
        public async Task<ActionResult> ResolveEvent(Guid id, [FromBody] ResolveEventDto dto)
        {
            var ev = await _context.DriverBehaviorEvents.FindAsync(id);
            if (ev == null) return NotFound();

            ev.IsResolved = true;
            ev.ResolvedAt = DateTime.UtcNow;
            ev.Resolution = dto.Resolution;

            await _context.SaveChangesAsync();
            return Ok(ev);
        }

        // DELETE: api/DriverBehavior/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteEvent(Guid id)
        {
            var ev = await _context.DriverBehaviorEvents.FindAsync(id);
            if (ev == null) return NotFound();

            _context.DriverBehaviorEvents.Remove(ev);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private static bool IsNegativeBehaviorEvent(DriverBehaviorEvent ev)
        {
            return string.Equals(ev.EventType, "Negative", StringComparison.OrdinalIgnoreCase)
                || ev.PointsImpact < 0;
        }

        private async Task NotifyOwnersOfBehaviorAlertAsync(DriverBehaviorEvent ev, DriverProfile driver)
        {
            try
            {
                var tenantId = ev.TenantId ?? driver.User?.TenantId;
                if (!tenantId.HasValue || tenantId.Value == Guid.Empty) return;

                var ownerUserIds = await _context.Users
                    .Where(u => u.TenantId == tenantId.Value && u.Role == "Owner" && u.IsActive)
                    .Select(u => u.Id)
                    .Distinct()
                    .ToListAsync();

                if (ownerUserIds.Count == 0) return;

                var eventDate = ev.EventDate == default ? DateTime.UtcNow : ev.EventDate;
                var driverName = string.IsNullOrWhiteSpace(driver.Name) ? "Driver" : driver.Name;
                var severity = string.IsNullOrWhiteSpace(ev.Severity) ? "Medium" : ev.Severity;
                var vehicleText = string.Empty;

                if (ev.VehicleId.HasValue)
                {
                    var vehicle = await _context.Vehicles
                        .Where(v => v.Id == ev.VehicleId.Value)
                        .Select(v => new { v.Registration, v.Make, v.Model })
                        .FirstOrDefaultAsync();

                    if (vehicle != null)
                    {
                        var reg = string.IsNullOrWhiteSpace(vehicle.Registration) ? "Unknown" : vehicle.Registration;
                        vehicleText = $" Vehicle: {reg} ({vehicle.Make} {vehicle.Model}).";
                    }
                }

                var subject = $"Driver behavior alert: {driverName} – {ev.Category}";
                var body =
                    $"A behavior alert was recorded for {driverName}. " +
                    $"Category: {ev.Category}. Severity: {severity}. " +
                    $"Date: {eventDate:yyyy-MM-dd HH:mm} UTC." +
                    vehicleText +
                    (string.IsNullOrWhiteSpace(ev.Description) ? string.Empty : $" Details: {ev.Description}");

                foreach (var ownerUserId in ownerUserIds)
                {
                    _context.Messages.Add(new Message
                    {
                        Id = Guid.NewGuid(),
                        SenderType = "System",
                        SenderId = ev.ReportedById,
                        SenderName = "Traffic Monitoring System",
                        RecipientType = "Owner",
                        RecipientId = ownerUserId,
                        Subject = subject,
                        Content = body,
                        MessageType = "Alert",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow,
                        RelatedEntityType = "DriverBehavior",
                        RelatedEntityId = ev.Id,
                        IsDeletedBySender = false,
                        IsDeletedByReceiver = false,
                    });
                }

                await _context.SaveChangesAsync();
            }
            catch
            {
                // Messaging should never block behavior-event recording.
            }
        }
    }

    // DTOs
    public class RecordBehaviorEventDto
    {
        public Guid DriverId { get; set; }
        public Guid? VehicleId { get; set; }
        public Guid? ReportedById { get; set; }
        public Guid? TenantId { get; set; }
        public string Category { get; set; } = string.Empty;
        public string? Severity { get; set; }
        public string? Description { get; set; }
        public string? Location { get; set; }
        public int PointsImpact { get; set; }
        public string? EventType { get; set; }
        public DateTime? EventDate { get; set; }
        public string? Notes { get; set; }
        public string? EvidenceUrl { get; set; }
    }

    public class ResolveEventDto
    {
        public string? Resolution { get; set; }
    }

    public class DriverScoreDto
    {
        public Guid DriverId { get; set; }
        public string DriverName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? PhotoUrl { get; set; }
        public Guid? AssignedVehicleId { get; set; }
        public int Score { get; set; }
        public string Grade { get; set; } = "A";
        public string Trend { get; set; } = "Stable";
        public int TotalEvents { get; set; }
        public int PositiveEvents { get; set; }
        public int NegativeEvents { get; set; }
        public int UnresolvedEvents { get; set; }
        public int Last30DaysEvents { get; set; }
        public DateTime? LastEventDate { get; set; }
        public string? TopCategory { get; set; }
    }
}
