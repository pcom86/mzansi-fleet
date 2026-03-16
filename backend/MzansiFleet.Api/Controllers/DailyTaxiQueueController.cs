using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Repository;
using MzansiFleet.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DailyTaxiQueueController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;
        private readonly ILogger<DailyTaxiQueueController> _logger;

        public DailyTaxiQueueController(MzansiFleetDbContext context, ILogger<DailyTaxiQueueController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/DailyTaxiQueue/by-rank/{rankId}?date=2026-03-13
        [HttpGet("by-rank/{rankId}")]
        public async Task<ActionResult> GetQueueByRank(Guid rankId, [FromQuery] DateTime? date)
        {
            var targetDate = (date ?? DateTime.UtcNow).Date;

            var queue = await _context.DailyTaxiQueues
                .Where(q => q.TaxiRankId == rankId && q.QueueDate == targetDate)
                .Include(q => q.Vehicle)
                .Include(q => q.Driver)
                .Include(q => q.Route)
                .OrderBy(q => q.Status == "Dispatched" ? 1 : 0) // active first
                .ThenBy(q => q.QueuePosition)
                .Select(q => new
                {
                    q.Id,
                    q.TaxiRankId,
                    q.RouteId,
                    routeName = q.Route != null ? q.Route.RouteName : null,
                    routeDestination = q.Route != null ? q.Route.DestinationStation : null,
                    q.VehicleId,
                    vehicleRegistration = q.Vehicle != null ? q.Vehicle.Registration : null,
                    vehicleMake = q.Vehicle != null ? q.Vehicle.Make : null,
                    vehicleModel = q.Vehicle != null ? q.Vehicle.Model : null,
                    vehicleCapacity = q.Vehicle != null ? q.Vehicle.Capacity : (int?)null,
                    q.DriverId,
                    driverName = q.Driver != null ? q.Driver.Name : null,
                    driverPhone = q.Driver != null ? q.Driver.Phone : null,
                    q.QueueDate,
                    q.QueuePosition,
                    joinedAt = q.JoinedAt.ToString(@"hh\:mm"),
                    q.Status,
                    q.DepartedAt,
                    q.PassengerCount,
                    q.Notes,
                    q.CreatedAt,
                })
                .ToListAsync();

            return Ok(queue);
        }

        // GET: api/DailyTaxiQueue/by-route/{routeId}?date=2026-03-13
        [HttpGet("by-route/{routeId}")]
        public async Task<ActionResult> GetQueueByRoute(Guid routeId, [FromQuery] DateTime? date)
        {
            var targetDate = (date ?? DateTime.UtcNow).Date;

            var queue = await _context.DailyTaxiQueues
                .Where(q => q.RouteId == routeId && q.QueueDate == targetDate && q.Status != "Removed")
                .Include(q => q.Vehicle)
                .Include(q => q.Driver)
                .OrderBy(q => q.Status == "Dispatched" ? 1 : 0)
                .ThenBy(q => q.QueuePosition)
                .Select(q => new
                {
                    q.Id,
                    q.TaxiRankId,
                    q.RouteId,
                    q.VehicleId,
                    vehicleRegistration = q.Vehicle != null ? q.Vehicle.Registration : null,
                    vehicleMake = q.Vehicle != null ? q.Vehicle.Make : null,
                    vehicleModel = q.Vehicle != null ? q.Vehicle.Model : null,
                    vehicleCapacity = q.Vehicle != null ? q.Vehicle.Capacity : (int?)null,
                    q.DriverId,
                    driverName = q.Driver != null ? q.Driver.Name : null,
                    driverPhone = q.Driver != null ? q.Driver.Phone : null,
                    q.QueueDate,
                    q.QueuePosition,
                    joinedAt = q.JoinedAt.ToString(@"hh\:mm"),
                    q.Status,
                    q.DepartedAt,
                    q.PassengerCount,
                    q.Notes,
                    q.CreatedAt,
                })
                .ToListAsync();

            return Ok(queue);
        }

        // POST: api/DailyTaxiQueue — Add vehicle to queue
        [HttpPost]
        public async Task<ActionResult> AddToQueue([FromBody] AddToQueueDto dto)
        {
            var today = DateTime.SpecifyKind((dto.QueueDate ?? DateTime.UtcNow).Date, DateTimeKind.Utc);

            // Check if vehicle is already in an active queue for this route today
            var existing = await _context.DailyTaxiQueues
                .AnyAsync(q => q.VehicleId == dto.VehicleId
                    && q.QueueDate == today
                    && q.RouteId == dto.RouteId
                    && q.Status != "Dispatched" && q.Status != "Removed");

            if (existing)
                return BadRequest(new { message = "Vehicle is already in the queue for this route today" });

            // Determine next queue position
            var maxPosition = await _context.DailyTaxiQueues
                .Where(q => q.TaxiRankId == dto.TaxiRankId
                    && q.RouteId == dto.RouteId
                    && q.QueueDate == today
                    && q.Status != "Dispatched" && q.Status != "Removed")
                .MaxAsync(q => (int?)q.QueuePosition) ?? 0;

            var entry = new DailyTaxiQueue
            {
                Id = Guid.NewGuid(),
                TaxiRankId = dto.TaxiRankId,
                RouteId = dto.RouteId,
                VehicleId = dto.VehicleId,
                DriverId = dto.DriverId,
                TenantId = dto.TenantId,
                QueueDate = today,
                QueuePosition = maxPosition + 1,
                JoinedAt = DateTime.UtcNow.TimeOfDay,
                Status = "Waiting",
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow,
            };

            _context.DailyTaxiQueues.Add(entry);
            await _context.SaveChangesAsync();

            // Return with vehicle info
            var created = await _context.DailyTaxiQueues
                .Include(q => q.Vehicle)
                .Include(q => q.Driver)
                .Include(q => q.Route)
                .FirstOrDefaultAsync(q => q.Id == entry.Id);

            return Ok(new
            {
                created!.Id,
                created.TaxiRankId,
                created.RouteId,
                routeName = created.Route?.RouteName,
                created.VehicleId,
                vehicleRegistration = created.Vehicle?.Registration,
                vehicleMake = created.Vehicle?.Make,
                vehicleModel = created.Vehicle?.Model,
                vehicleCapacity = created.Vehicle?.Capacity,
                created.DriverId,
                driverName = created.Driver?.Name,
                created.QueueDate,
                created.QueuePosition,
                joinedAt = created.JoinedAt.ToString(@"hh\:mm"),
                created.Status,
                created.Notes,
                created.CreatedAt,
            });
        }

        // PUT: api/DailyTaxiQueue/{id}/dispatch — Mark vehicle as departed
        [HttpPut("{id}/dispatch")]
        public async Task<ActionResult> DispatchVehicle(Guid id, [FromBody] DispatchDto? dto)
        {
            try
            {
                _logger.LogInformation($"[Queue] DispatchVehicle called with id: {id}, dto: {System.Text.Json.JsonSerializer.Serialize(dto)}");
                
                var entry = await _context.DailyTaxiQueues.FindAsync(id);
                if (entry == null)
                {
                    _logger.LogWarning($"[Queue] Queue entry not found: {id}");
                    return NotFound(new { message = "Queue entry not found" });
                }

                _logger.LogInformation($"[Queue] Found entry: Status={entry.Status}, Position={entry.QueuePosition}, TaxiRankId={entry.TaxiRankId}, RouteId={entry.RouteId}");

                if (entry.Status == "Dispatched")
                {
                    _logger.LogInformation($"[Queue] Vehicle already dispatched: {id}");
                    return Ok(new
                    {
                        message = "Vehicle was already dispatched",
                        id = entry.Id,
                        alreadyDispatched = true,
                        departedAt = entry.DepartedAt,
                        passengerCount = entry.PassengerCount
                    });
                }

                entry.Status = "Dispatched";
                entry.DepartedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                entry.DispatchedByUserId = dto?.DispatchedByUserId;
                
                // Auto-calculate passenger count from list if provided, otherwise use explicit count
                var passengerList = dto?.Passengers;
                entry.PassengerCount = passengerList?.Count > 0 ? passengerList.Count : (dto?.PassengerCount ?? 0);
                
                entry.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);

                _logger.LogInformation($"[Queue] Updated entry: PassengerCount={entry.PassengerCount}, DispatchedByUserId={entry.DispatchedByUserId}");

                await _context.SaveChangesAsync();
                _logger.LogInformation($"[Queue] Saved entry status changes");

                // Create TaxiRankTrip and store passengers if passenger list provided
                if (passengerList?.Count > 0)
                {
                    try
                    {
                        // Get route details for departure/destination
                        var route = entry.RouteId.HasValue 
                            ? await _context.Routes.FindAsync(entry.RouteId.Value) 
                            : null;

                        var taxiRank = await _context.TaxiRanks.FindAsync(entry.TaxiRankId);

                        // Create the trip record
                        var trip = new TaxiRankTrip
                        {
                            Id = Guid.NewGuid(),
                            TenantId = entry.TenantId,
                            VehicleId = entry.VehicleId,
                            DriverId = entry.DriverId,
                            TaxiRankId = entry.TaxiRankId,
                            MarshalId = dto?.DispatchedByUserId, // Marshal who dispatched
                            DepartureStation = taxiRank?.Name ?? "Unknown",
                            DestinationStation = route?.DestinationStation ?? "Unknown",
                            DepartureTime = DateTime.UtcNow,
                            TotalAmount = passengerList.Sum(p => p.Amount),
                            TotalCosts = 0,
                            NetAmount = passengerList.Sum(p => p.Amount),
                            Status = "Departed",
                            PassengerCount = passengerList.Count,
                            CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc)
                        };

                        _context.TaxiRankTrips.Add(trip);
                        _logger.LogInformation($"[Queue] Created TaxiRankTrip: {trip.Id}");

                        // Add passengers to the trip
                        foreach (var passengerDto in passengerList.Where(p => !string.IsNullOrWhiteSpace(p.Name)))
                        {
                            var passenger = new TripPassenger
                            {
                                Id = Guid.NewGuid(),
                                TaxiRankTripId = trip.Id,
                                UserId = dto?.DispatchedByUserId ?? Guid.Empty, // Marshal as placeholder
                                PassengerName = passengerDto.Name,
                                PassengerPhone = passengerDto.Contact,
                                DepartureStation = taxiRank?.Name ?? "Unknown",
                                ArrivalStation = passengerDto.Destination ?? route?.DestinationStation ?? "Unknown",
                                Amount = passengerDto.Amount,
                                PaymentMethod = "Cash",
                                BoardedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc)
                            };
                            _context.TripPassengers.Add(passenger);
                        }

                        await _context.SaveChangesAsync();
                        _logger.LogInformation($"[Queue] Stored {passengerList.Count} passengers for trip {trip.Id}");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"[Queue] Error creating trip/passengers: {ex.Message}");
                        // Don't fail the dispatch if passenger storage fails
                    }
                }

                // Shift remaining vehicles up by 1 - handle null RouteId and QueueDate gracefully
                var remaining = await _context.DailyTaxiQueues
                    .Where(q => q.TaxiRankId == entry.TaxiRankId
                        && (entry.RouteId == null || q.RouteId == entry.RouteId)
                        && (entry.QueueDate == null || q.QueueDate == entry.QueueDate)
                        && q.QueuePosition > entry.QueuePosition
                        && q.Status != "Dispatched" && q.Status != "Removed")
                    .OrderBy(q => q.QueuePosition)
                    .ToListAsync();

                _logger.LogInformation($"[Queue] Found {remaining.Count} vehicles to reposition");

                foreach (var r in remaining)
                {
                    r.QueuePosition--;
                    r.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                    _logger.LogDebug($"[Queue] Repositioning vehicle {r.Id} from {r.QueuePosition + 1} to {r.QueuePosition}");
                }

                await _context.SaveChangesAsync();
                _logger.LogInformation($"[Queue] Successfully dispatched vehicle {id}");

                return Ok(new { message = "Vehicle dispatched successfully", id = entry.Id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[Queue] Error dispatching vehicle {id}: {ex.Message}");
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        // PUT: api/DailyTaxiQueue/{id}/reorder — Change queue position
        [HttpPut("{id}/reorder")]
        public async Task<ActionResult> ReorderVehicle(Guid id, [FromBody] ReorderDto dto)
        {
            var entry = await _context.DailyTaxiQueues.FindAsync(id);
            if (entry == null)
                return NotFound(new { message = "Queue entry not found" });

            if (entry.Status == "Dispatched" || entry.Status == "Removed")
                return BadRequest(new { message = "Cannot reorder a dispatched or removed entry" });

            var oldPos = entry.QueuePosition;
            var newPos = dto.NewPosition;

            if (oldPos == newPos)
                return Ok(new { message = "No change" });

            // Get all active entries for the same rank/route/date - handle null values gracefully
            var activeEntries = await _context.DailyTaxiQueues
                .Where(q => q.TaxiRankId == entry.TaxiRankId
                    && (entry.RouteId == null || q.RouteId == entry.RouteId)
                    && (entry.QueueDate == null || q.QueueDate == entry.QueueDate)
                    && q.Status != "Dispatched" && q.Status != "Removed")
                .OrderBy(q => q.QueuePosition)
                .ToListAsync();

            // Clamp newPos
            newPos = Math.Max(1, Math.Min(newPos, activeEntries.Count));

            if (newPos < oldPos)
            {
                // Moving up: shift others down
                foreach (var e in activeEntries.Where(e => e.QueuePosition >= newPos && e.QueuePosition < oldPos && e.Id != id))
                {
                    e.QueuePosition++;
                    e.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                }
            }
            else
            {
                // Moving down: shift others up
                foreach (var e in activeEntries.Where(e => e.QueuePosition > oldPos && e.QueuePosition <= newPos && e.Id != id))
                {
                    e.QueuePosition--;
                    e.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                }
            }

            entry.QueuePosition = newPos;
            entry.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Reordered", id = entry.Id, newPosition = newPos });
        }

        // PUT: api/DailyTaxiQueue/{id}/remove — Remove vehicle from queue
        [HttpPut("{id}/remove")]
        public async Task<ActionResult> RemoveFromQueue(Guid id)
        {
            try
            {
                _logger.LogInformation($"[Queue] RemoveFromQueue called with id: {id}");
                
                var entry = await _context.DailyTaxiQueues.FindAsync(id);
                if (entry == null)
                {
                    _logger.LogWarning($"[Queue] Queue entry not found: {id}");
                    return NotFound(new { message = "Queue entry not found" });
                }

                _logger.LogInformation($"[Queue] Found entry: Status={entry.Status}, Position={entry.QueuePosition}, TaxiRankId={entry.TaxiRankId}, RouteId={entry.RouteId}");

                if (entry.Status == "Dispatched")
                {
                    _logger.LogWarning($"[Queue] Cannot remove dispatched vehicle: {id}");
                    return BadRequest(new { message = "Cannot remove a dispatched vehicle" });
                }

                var oldPos = entry.QueuePosition;
                entry.Status = "Removed";
                entry.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);

                await _context.SaveChangesAsync();
                _logger.LogInformation($"[Queue] Updated entry status to Removed");

                // Shift remaining vehicles up - handle null RouteId and QueueDate gracefully
                var remaining = await _context.DailyTaxiQueues
                    .Where(q => q.TaxiRankId == entry.TaxiRankId
                        && (entry.RouteId == null || q.RouteId == entry.RouteId)
                        && (entry.QueueDate == null || q.QueueDate == entry.QueueDate)
                        && q.QueuePosition > oldPos
                        && q.Status != "Dispatched" && q.Status != "Removed")
                    .OrderBy(q => q.QueuePosition)
                    .ToListAsync();

                _logger.LogInformation($"[Queue] Found {remaining.Count} vehicles to reposition");

                foreach (var r in remaining)
                {
                    r.QueuePosition--;
                    r.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                    _logger.LogDebug($"[Queue] Repositioning vehicle {r.Id} from {r.QueuePosition + 1} to {r.QueuePosition}");
                }

                await _context.SaveChangesAsync();
                _logger.LogInformation($"[Queue] Successfully removed vehicle {id} from queue");

                return Ok(new { message = "Vehicle removed from queue", id = entry.Id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[Queue] Error removing vehicle {id} from queue: {ex.Message}");
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        // GET: api/DailyTaxiQueue/stats/{rankId}?date=2026-03-13
        [HttpGet("stats/{rankId}")]
        public async Task<ActionResult> GetQueueStats(Guid rankId, [FromQuery] DateTime? date)
        {
            var targetDate = (date ?? DateTime.UtcNow).Date;

            var entries = await _context.DailyTaxiQueues
                .Where(q => q.TaxiRankId == rankId && q.QueueDate == targetDate)
                .ToListAsync();

            var waiting = entries.Count(e => e.Status == "Waiting" || e.Status == "Loading");
            var dispatched = entries.Count(e => e.Status == "Dispatched");
            var removed = entries.Count(e => e.Status == "Removed");
            var totalPassengers = entries.Where(e => e.Status == "Dispatched").Sum(e => e.PassengerCount ?? 0);

            // Average wait time (for dispatched vehicles: DepartedAt - CreatedAt)
            var dispatchedEntries = entries.Where(e => e.Status == "Dispatched" && e.DepartedAt.HasValue).ToList();
            double avgWaitMinutes = 0;
            if (dispatchedEntries.Count > 0)
            {
                avgWaitMinutes = dispatchedEntries
                    .Average(e => (e.DepartedAt!.Value - e.CreatedAt).TotalMinutes);
            }

            return Ok(new
            {
                date = targetDate,
                waiting,
                dispatched,
                removed,
                total = entries.Count,
                totalPassengers,
                avgWaitMinutes = Math.Round(avgWaitMinutes, 1),
            });
        }
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────────

    public class AddToQueueDto
    {
        public Guid TaxiRankId { get; set; }
        public Guid? RouteId { get; set; }
        public Guid VehicleId { get; set; }
        public Guid? DriverId { get; set; }
        public Guid TenantId { get; set; }
        public DateTime? QueueDate { get; set; }
        public string? Notes { get; set; }
    }

    public class DispatchDto
    {
        public Guid? DispatchedByUserId { get; set; }
        public int? PassengerCount { get; set; }
        public List<PassengerDto>? Passengers { get; set; }
    }

    public class PassengerDto
    {
        public string? Name { get; set; }
        public string? Contact { get; set; }
        public string? Destination { get; set; }
        public decimal Amount { get; set; }
    }

    public class ReorderDto
    {
        public int NewPosition { get; set; }
    }
}
