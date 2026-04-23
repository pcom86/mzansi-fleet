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

        // GET: api/DailyTaxiQueue/my-queue?driverId={id}&date=2026-03-19
        [HttpGet("my-queue")]
        public async Task<ActionResult> GetMyQueue([FromQuery] Guid driverId, [FromQuery] DateTime? date)
        {
            if (driverId == Guid.Empty)
            {
                return BadRequest(new { message = "driverId is required" });
            }

            var targetDate = DateTime.SpecifyKind((date ?? DateTime.UtcNow).Date, DateTimeKind.Utc);

            var driver = await _context.DriverProfiles
                .Where(d => d.Id == driverId)
                .Select(d => new
                {
                    d.Id,
                    d.Name,
                    d.AssignedVehicleId,
                })
                .FirstOrDefaultAsync();

            if (driver == null)
            {
                return NotFound(new { message = "Driver not found" });
            }

            var vehicleId = driver.AssignedVehicleId;
            if (!vehicleId.HasValue || vehicleId.Value == Guid.Empty)
            {
                return Ok(new
                {
                    date = targetDate,
                    driverId,
                    driverName = driver.Name,
                    message = "No vehicle assigned to this driver",
                    queue = Array.Empty<object>(),
                });
            }

            var vehicleRegistration = await _context.Vehicles
                .Where(v => v.Id == vehicleId.Value)
                .Select(v => v.Registration)
                .FirstOrDefaultAsync();

            // Prefer today's queue entry for this vehicle to determine active rank/route context.
            var myEntry = await _context.DailyTaxiQueues
                .Where(q => q.VehicleId == vehicleId.Value
                    && q.QueueDate == targetDate
                    && q.Status != "Removed")
                .OrderByDescending(q => q.CreatedAt)
                .FirstOrDefaultAsync();

            Guid? rankId = myEntry?.TaxiRankId;
            Guid? routeId = myEntry?.RouteId;

            // Fallback to active vehicle-rank assignment if no queue entry exists yet today.
            if (!rankId.HasValue || rankId.Value == Guid.Empty)
            {
                rankId = await _context.VehicleTaxiRanks
                    .Where(vr => vr.VehicleId == vehicleId.Value && vr.IsActive)
                    .OrderByDescending(vr => vr.AssignedDate)
                    .Select(vr => (Guid?)vr.TaxiRankId)
                    .FirstOrDefaultAsync();
            }

            if (!rankId.HasValue || rankId.Value == Guid.Empty)
            {
                return Ok(new
                {
                    date = targetDate,
                    driverId,
                    driverName = driver.Name,
                    vehicleId,
                    vehicleRegistration,
                    message = "Vehicle is not linked to any taxi rank",
                    queue = Array.Empty<object>(),
                });
            }

            var rankName = await _context.TaxiRanks
                .Where(r => r.Id == rankId.Value)
                .Select(r => r.Name)
                .FirstOrDefaultAsync();

            var routeName = routeId.HasValue
                ? await _context.Routes
                    .Where(r => r.Id == routeId.Value)
                    .Select(r => r.RouteName)
                    .FirstOrDefaultAsync()
                : null;

            var queue = await _context.DailyTaxiQueues
                .Where(q => q.TaxiRankId == rankId.Value && q.QueueDate == targetDate && q.Status != "Removed")
                .OrderBy(q => q.Status == "Dispatched" ? 1 : 0)
                .ThenBy(q => q.QueuePosition)
                .Select(q => new
                {
                    q.Id,
                    q.VehicleId,
                    vehicleRegistration = q.Vehicle != null ? q.Vehicle.Registration : null,
                    vehicleMake = q.Vehicle != null ? q.Vehicle.Make : null,
                    vehicleModel = q.Vehicle != null ? q.Vehicle.Model : null,
                    q.DriverId,
                    driverName = q.Driver != null
                        ? q.Driver.Name
                        : _context.DriverProfiles
                            .Where(d => d.AssignedVehicleId == q.VehicleId)
                            .Select(d => d.Name)
                            .FirstOrDefault(),
                    q.RouteId,
                    routeName = q.Route != null ? q.Route.RouteName : null,
                    q.QueuePosition,
                    q.Status,
                    joinedAt = q.JoinedAt.ToString(@"hh\:mm"),
                    q.EstimatedDepartureTime,
                    q.DepartedAt,
                    q.PassengerCount,
                    tripId = _context.TaxiRankTrips
                        .Where(t => t.VehicleId == q.VehicleId
                            && t.TaxiRankId == q.TaxiRankId
                            && t.DepartureTime.Date == targetDate
                            && t.Status != "Completed"
                            && t.Status != "Cancelled")
                        .OrderByDescending(t => t.DepartureTime)
                        .Select(t => (Guid?)t.Id)
                        .FirstOrDefault(),
                    isMine = q.VehicleId == vehicleId.Value,
                })
                .ToListAsync();

            var mine = queue.FirstOrDefault(q => q.isMine);

            return Ok(new
            {
                date = targetDate,
                driverId,
                driverName = driver.Name,
                vehicleId,
                vehicleRegistration,
                rankId,
                rankName,
                routeId,
                routeName,
                myQueueEntryId = mine?.Id,
                myTripId = mine?.tripId,
                myPosition = mine?.QueuePosition,
                myStatus = mine?.Status,
                totalVehicles = queue.Count,
                waitingCount = queue.Count(q => q.Status == "Waiting" || q.Status == "Loading"),
                dispatchedCount = queue.Count(q => q.Status == "Dispatched"),
                queue,
            });
        }

        // GET: api/DailyTaxiQueue/by-rank/{rankId}?date=2026-03-13
        [HttpGet("by-rank/{rankId}")]
        public async Task<ActionResult> GetQueueByRank(Guid rankId, [FromQuery] DateTime? date)
        {
            var targetDate = DateTime.SpecifyKind((date ?? DateTime.UtcNow).Date, DateTimeKind.Utc);

            var queue = await _context.DailyTaxiQueues
                .Where(q => q.TaxiRankId == rankId && q.QueueDate == targetDate)
                .Include(q => q.Vehicle)
                .Include(q => q.Driver)
                .Include(q => q.Route)
                .Include(q => q.DispatchedByUser)
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
                    driverName = q.Driver != null
                        ? q.Driver.Name
                        : _context.DriverProfiles
                            .Where(d => d.AssignedVehicleId == q.VehicleId)
                            .Select(d => d.Name)
                            .FirstOrDefault(),
                    driverPhone = q.Driver != null
                        ? q.Driver.Phone
                        : _context.DriverProfiles
                            .Where(d => d.AssignedVehicleId == q.VehicleId)
                            .Select(d => d.Phone)
                            .FirstOrDefault(),
                    q.QueueDate,
                    q.QueuePosition,
                    joinedAt = q.JoinedAt.ToString(@"hh\:mm"),
                    q.Status,
                    q.DepartedAt,
                    q.EstimatedDepartureTime,
                    q.PassengerCount,
                    q.Notes,
                    q.CreatedAt,
                    q.DispatchedByUserId,
                    dispatchedByName = q.DispatchedByUser != null
                        ? q.DispatchedByUser.FullName
                        : null,
                    tripId = _context.TaxiRankTrips
                        .Where(t => t.VehicleId == q.VehicleId && t.TaxiRankId == q.TaxiRankId
                            && t.DepartureTime.Date == targetDate)
                        .OrderByDescending(t => t.DepartureTime)
                        .Select(t => (Guid?)t.Id)
                        .FirstOrDefault(),
                })
                .ToListAsync();

            return Ok(queue);
        }

        // GET: api/DailyTaxiQueue/by-route/{routeId}?date=2026-03-13
        [HttpGet("by-route/{routeId}")]
        public async Task<ActionResult> GetQueueByRoute(Guid routeId, [FromQuery] DateTime? date)
        {
            var targetDate = DateTime.SpecifyKind((date ?? DateTime.UtcNow).Date, DateTimeKind.Utc);

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
                    driverName = q.Driver != null
                        ? q.Driver.Name
                        : _context.DriverProfiles
                            .Where(d => d.AssignedVehicleId == q.VehicleId)
                            .Select(d => d.Name)
                            .FirstOrDefault(),
                    driverPhone = q.Driver != null
                        ? q.Driver.Phone
                        : _context.DriverProfiles
                            .Where(d => d.AssignedVehicleId == q.VehicleId)
                            .Select(d => d.Phone)
                            .FirstOrDefault(),
                    q.QueueDate,
                    q.QueuePosition,
                    joinedAt = q.JoinedAt.ToString(@"hh\:mm"),
                    q.Status,
                    q.DepartedAt,
                    q.EstimatedDepartureTime,
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
                EstimatedDepartureTime = dto.EstimatedDepartureTime,
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
                created.EstimatedDepartureTime,
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

                // Validate passenger count against vehicle capacity
                var vehicle = await _context.Vehicles.FindAsync(entry.VehicleId);
                if (vehicle?.Capacity > 0 && entry.PassengerCount > vehicle.Capacity)
                {
                    _logger.LogWarning($"[Queue] Passenger count {entry.PassengerCount} exceeds vehicle capacity {vehicle.Capacity} for vehicle {entry.VehicleId}");
                }
                
                entry.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);

                _logger.LogInformation($"[Queue] Updated entry: PassengerCount={entry.PassengerCount}, DispatchedByUserId={entry.DispatchedByUserId}");

                // Ensure a driver is attached to the dispatch so earnings reflect on the driver profile.
                Guid? resolvedDriverId = entry.DriverId;
                if (!resolvedDriverId.HasValue || resolvedDriverId.Value == Guid.Empty)
                {
                    resolvedDriverId = await _context.DriverProfiles
                        .Where(d => d.AssignedVehicleId == entry.VehicleId)
                        .Select(d => (Guid?)d.Id)
                        .FirstOrDefaultAsync();

                    if (resolvedDriverId.HasValue && resolvedDriverId.Value != Guid.Empty)
                    {
                        entry.DriverId = resolvedDriverId;
                        _logger.LogInformation($"[Queue] Auto-resolved driver {resolvedDriverId} for vehicle {entry.VehicleId}");
                    }
                    else
                    {
                        _logger.LogWarning($"[Queue] No driver found for vehicle {entry.VehicleId}; trip earnings will not be linked to a driver profile");
                    }
                }

                await _context.SaveChangesAsync();
                _logger.LogInformation($"[Queue] Saved entry status changes");

                // Track earnings for response
                decimal _totalFare = 0;
                bool _earningsRecorded = false;

                // Create TaxiRankTrip and store passengers if passenger list provided
                // Resolve route: from queue entry directly, or via vehicle's RouteVehicle assignment
                var route = entry.RouteId.HasValue
                    ? await _context.Routes.FindAsync(entry.RouteId.Value)
                    : null;
                if (route == null)
                {
                    route = await _context.RouteVehicles
                        .Include(rv => rv.Route)
                        .Where(rv => rv.VehicleId == entry.VehicleId && rv.IsActive)
                        .Select(rv => rv.Route)
                        .FirstOrDefaultAsync();
                }
                var taxiRank = await _context.TaxiRanks.FindAsync(entry.TaxiRankId);

                if (passengerList?.Count > 0)
                {
                    try
                    {

                        // Create the trip record
                        var trip = new TaxiRankTrip
                        {
                            Id = Guid.NewGuid(),
                            TenantId = entry.TenantId,
                            VehicleId = entry.VehicleId,
                            DriverId = resolvedDriverId,
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

                        // Resolve a valid UserId for the FK: marshal → driver → skip passengers if neither exists
                        var resolvedUserId = dto?.DispatchedByUserId ?? entry.DriverId;
                        if (resolvedUserId == null || resolvedUserId == Guid.Empty)
                        {
                            _logger.LogWarning("[Queue] No valid UserId for passengers – skipping TripPassenger rows");
                        }
                        else
                        {
                            // Add passengers to the trip
                            foreach (var passengerDto in passengerList.Where(p => !string.IsNullOrWhiteSpace(p.Name)))
                            {
                                var passenger = new TripPassenger
                                {
                                    Id = Guid.NewGuid(),
                                    TaxiRankTripId = trip.Id,
                                    UserId = resolvedUserId.Value,
                                PassengerName = passengerDto.Name,
                                PassengerPhone = passengerDto.Contact,
                                NextOfKinName = passengerDto.NextOfKinName,
                                NextOfKinContact = passengerDto.NextOfKinContact,
                                DepartureStation = taxiRank?.Name ?? "Unknown",
                                ArrivalStation = passengerDto.Destination ?? route?.DestinationStation ?? "Unknown",
                                Amount = passengerDto.Amount,
                                PaymentMethod = passengerDto.PaymentMethod ?? "Cash",
                                SeatNumber = passengerDto.SeatNumber,
                                    BoardedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc)
                                };
                                _context.TripPassengers.Add(passenger);
                            }
                        }

                        await _context.SaveChangesAsync();
                        _logger.LogInformation($"[Queue] Stored {passengerList.Count} passengers for trip {trip.Id}");

                        // Add vehicle earnings from trip fare
                        _totalFare = passengerList.Sum(p => p.Amount);
                        if (_totalFare > 0)
                        {
                            var routeName = $"{taxiRank?.Name} → {route?.DestinationStation}";
                            var earnings = new VehicleEarnings
                            {
                                Id = Guid.NewGuid(),
                                VehicleId = entry.VehicleId,
                                Date = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc),
                                Amount = _totalFare,
                                Source = routeName,
                                Description = $"Taxi rank trip from {taxiRank?.Name} to {route?.DestinationStation} - {passengerList.Count} passengers",
                                Period = "Daily",
                                CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc)
                            };
                            _context.VehicleEarnings.Add(earnings);
                            await _context.SaveChangesAsync();
                            _earningsRecorded = true;
                            _logger.LogInformation($"[Queue] Added vehicle earnings: R{_totalFare} for vehicle {entry.VehicleId}");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"[Queue] Error creating trip/passengers/earnings: {ex.Message}");
                        // Detach any failed entities so subsequent SaveChanges doesn't re-attempt them
                        foreach (var failedEntry in _context.ChangeTracker.Entries()
                            .Where(e => e.State == EntityState.Added))
                        {
                            failedEntry.State = EntityState.Detached;
                        }
                    }
                }
                else if (dto?.FareAmount > 0)
                {
                    // Quick dispatch with fare info — create trip record without individual passengers
                    try
                    {
                        var quickFare = dto.FareAmount ?? 0;

                        var trip = new TaxiRankTrip
                        {
                            Id = Guid.NewGuid(),
                            TenantId = entry.TenantId,
                            VehicleId = entry.VehicleId,
                            DriverId = resolvedDriverId,
                            TaxiRankId = entry.TaxiRankId,
                            MarshalId = dto.DispatchedByUserId,
                            DepartureStation = taxiRank?.Name ?? "Unknown",
                            DestinationStation = route?.DestinationStation ?? "Unknown",
                            DepartureTime = DateTime.UtcNow,
                            TotalAmount = quickFare,
                            TotalCosts = 0,
                            NetAmount = quickFare,
                            Status = "Departed",
                            PassengerCount = entry.PassengerCount,
                            CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc)
                        };

                        _context.TaxiRankTrips.Add(trip);
                        await _context.SaveChangesAsync();
                        _logger.LogInformation($"[Queue] Created quick-dispatch TaxiRankTrip: {trip.Id}, Fare: R{quickFare}");

                        // Record vehicle earnings
                        if (quickFare > 0)
                        {
                            _totalFare = quickFare;
                            var routeName = $"{taxiRank?.Name} → {route?.DestinationStation}";
                            var earnings = new VehicleEarnings
                            {
                                Id = Guid.NewGuid(),
                                VehicleId = entry.VehicleId,
                                Date = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc),
                                Amount = quickFare,
                                Source = routeName,
                                Description = $"Quick dispatch from {taxiRank?.Name} to {route?.DestinationStation} - {entry.PassengerCount} passengers",
                                Period = "Daily",
                                CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc)
                            };
                            _context.VehicleEarnings.Add(earnings);
                            await _context.SaveChangesAsync();
                            _earningsRecorded = true;
                            _logger.LogInformation($"[Queue] Added quick-dispatch earnings: R{quickFare} for vehicle {entry.VehicleId}");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"[Queue] Error creating quick-dispatch trip/earnings: {ex.Message}");
                        foreach (var failedEntry in _context.ChangeTracker.Entries()
                            .Where(e => e.State == EntityState.Added))
                        {
                            failedEntry.State = EntityState.Detached;
                        }
                    }
                }

                // Auto-confirm bookings for this queue entry on dispatch
                try
                {
                    var activeBookings = await _context.QueueBookings
                        .Include(b => b.Passengers)
                        .Where(b => b.QueueEntryId == id && b.Status != "Cancelled" && b.Status != "Expired")
                        .ToListAsync();
                    foreach (var bk in activeBookings)
                    {
                        if (bk.Status != "Confirmed")
                        {
                            bk.Status = "Confirmed";
                            bk.ConfirmedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                        }
                        // Auto-allocate seat numbers to booking passengers that don't have them
                        if (passengerList?.Count > 0)
                        {
                            foreach (var bp in bk.Passengers.Where(p => p.SeatNumber == null))
                            {
                                var matching = passengerList.FirstOrDefault(dp =>
                                    dp.FromBooking &&
                                    string.Equals(dp.Name?.Trim(), bp.Name?.Trim(), StringComparison.OrdinalIgnoreCase) &&
                                    dp.SeatNumber.HasValue);
                                if (matching != null)
                                    bp.SeatNumber = matching.SeatNumber;
                            }
                        }
                    }
                    if (activeBookings.Count > 0)
                    {
                        await _context.SaveChangesAsync();
                        _logger.LogInformation($"[Queue] Confirmed {activeBookings.Count} booking(s) for dispatched queue entry {id}");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[Queue] Error confirming bookings on dispatch for queue entry {QueueEntryId}", id);
                }

                // Shift remaining vehicles up by 1 - handle null RouteId gracefully
                var remaining = await _context.DailyTaxiQueues
                    .Where(q => q.TaxiRankId == entry.TaxiRankId
                        && (entry.RouteId == null || q.RouteId == entry.RouteId)
                        && q.QueueDate == entry.QueueDate
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

                return Ok(new
                {
                    message = "Vehicle dispatched successfully",
                    id = entry.Id,
                    totalFare = _totalFare,
                    passengerCount = entry.PassengerCount,
                    earningsRecorded = _earningsRecorded
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[Queue] Error dispatching vehicle {id}: {ex.Message}");
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        // GET: api/DailyTaxiQueue/{id}/trip-details
        [HttpGet("{id}/trip-details")]
        public async Task<ActionResult<object>> GetQueueTripDetails(Guid id)
        {
            try
            {
                var queueEntry = await _context.DailyTaxiQueues
                    .Include(q => q.Vehicle)
                    .Include(q => q.Driver)
                    .Include(q => q.Route)
                    .Include(q => q.TaxiRank)
                    .FirstOrDefaultAsync(q => q.Id == id);

                if (queueEntry == null)
                    return NotFound(new { message = "Queue entry not found" });

                if (queueEntry.Status != "Dispatched")
                    return BadRequest(new { message = "Trip details are only available for dispatched vehicles" });

                // Resolve driver via fallback if needed
                string driverName = queueEntry.Driver?.Name;
                string driverPhone = queueEntry.Driver?.Phone;
                if (string.IsNullOrEmpty(driverName))
                {
                    var fallbackDriver = await _context.DriverProfiles
                        .FirstOrDefaultAsync(d => d.AssignedVehicleId == queueEntry.VehicleId);
                    if (fallbackDriver != null)
                    {
                        driverName = fallbackDriver.Name;
                        driverPhone = fallbackDriver.Phone;
                    }
                }

                // Find the associated trip
                var trip = await _context.TaxiRankTrips
                    .Include(t => t.Vehicle)
                    .Include(t => t.Driver)
                    .Include(t => t.Marshal)
                    .Include(t => t.TaxiRank)
                    .FirstOrDefaultAsync(t => t.VehicleId == queueEntry.VehicleId 
                        && t.TaxiRankId == queueEntry.TaxiRankId
                        && t.DepartureTime.Date == queueEntry.QueueDate
                        && t.Status != "Completed"
                        && t.Status != "Cancelled");

                if (trip == null)
                    return NotFound(new { message = "No active trip found for this queue entry" });

                // Use trip driver if queue entry driver was null
                var tripDriverName = trip.Driver?.Name ?? driverName;
                var tripDriverPhone = trip.Driver?.Phone ?? driverPhone;

                // Get passengers for this trip
                var passengers = await _context.TripPassengers
                    .Where(p => p.TaxiRankTripId == trip.Id)
                    .OrderBy(p => p.SeatNumber ?? 999)
                    .ToListAsync();

                // Get costs for this trip
                var costs = await _context.TripCosts
                    .Where(c => c.TaxiRankTripId == trip.Id)
                    .OrderByDescending(c => c.CreatedAt)
                    .ToListAsync();

                var result = new
                {
                    QueueEntry = new
                    {
                        queueEntry.Id,
                        queueEntry.QueuePosition,
                        queueEntry.Status,
                        queueEntry.JoinedAt,
                        queueEntry.DepartedAt,
                        queueEntry.EstimatedDepartureTime,
                        queueEntry.PassengerCount,
                        queueEntry.Notes,
                        queueEntry.QueueDate,
                        Vehicle = queueEntry.Vehicle != null ? new
                        {
                            queueEntry.Vehicle.Id,
                            queueEntry.Vehicle.Make,
                            queueEntry.Vehicle.Model,
                            queueEntry.Vehicle.Registration,
                            queueEntry.Vehicle.Type,
                            queueEntry.Vehicle.Capacity
                        } : null,
                        DriverName = driverName,
                        DriverPhone = driverPhone,
                        Driver = new
                        {
                            name = driverName,
                            phone = driverPhone
                        },
                        Route = queueEntry.Route != null ? new
                        {
                            queueEntry.Route.Id,
                            queueEntry.Route.RouteName,
                            queueEntry.Route.DepartureStation,
                            queueEntry.Route.DestinationStation
                        } : null,
                        TaxiRank = queueEntry.TaxiRank != null ? new
                        {
                            queueEntry.TaxiRank.Id,
                            queueEntry.TaxiRank.Name,
                            queueEntry.TaxiRank.Code,
                            queueEntry.TaxiRank.Address,
                            queueEntry.TaxiRank.City,
                            queueEntry.TaxiRank.Province
                        } : null
                    },
                    Trip = new
                    {
                        trip.Id,
                        trip.TenantId,
                        trip.VehicleId,
                        trip.DriverId,
                        trip.MarshalId,
                        trip.TaxiRankId,
                        trip.DepartureStation,
                        trip.DestinationStation,
                        trip.DepartureTime,
                        trip.ArrivalTime,
                        trip.Status,
                        trip.PassengerCount,
                        trip.TotalAmount,
                        trip.TotalCosts,
                        trip.NetAmount,
                        trip.Notes,
                        trip.CompletedAt,
                        trip.Latitude,
                        trip.Longitude,
                        trip.CreatedAt,
                        trip.UpdatedAt,
                        DriverName = tripDriverName,
                        DriverPhone = tripDriverPhone,
                        Driver = new { name = tripDriverName, phone = tripDriverPhone }
                    },
                    Passengers = passengers.Select(p => new
                    {
                        p.Id,
                        p.TaxiRankTripId,
                        p.UserId,
                        p.PassengerName,
                        p.PassengerPhone,
                        p.DepartureStation,
                        p.ArrivalStation,
                        p.Amount,
                        p.PaymentMethod,
                        p.PaymentReference,
                        p.SeatNumber,
                        p.BoardedAt,
                        p.Notes
                    }).ToList(),
                    Costs = costs.Select(c => new
                    {
                        c.Id,
                        c.TaxiRankTripId,
                        c.AddedByDriverId,
                        c.Category,
                        c.Amount,
                        c.Description,
                        c.ReceiptNumber,
                        c.CreatedAt
                    }).ToList(),
                    Summary = new
                    {
                        TotalPassengers = passengers.Count,
                        TotalEarnings = passengers.Sum(p => p.Amount),
                        CashEarnings = passengers.Where(p => (p.PaymentMethod ?? "Cash") == "Cash").Sum(p => p.Amount),
                        CardEarnings = passengers.Where(p => (p.PaymentMethod ?? "Cash") == "Card").Sum(p => p.Amount),
                        TotalCosts = costs.Sum(c => c.Amount),
                        NetEarnings = passengers.Sum(p => p.Amount) - costs.Sum(c => c.Amount)
                    }
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[Queue] Error getting trip details for queue entry {id}: {ex.Message}");
                return StatusCode(500, new { error = ex.Message, details = ex.InnerException?.Message });
            }
        }

        // PUT: api/DailyTaxiQueue/{id}/complete-trip
        [HttpPut("{id}/complete-trip")]
        public async Task<ActionResult> CompleteQueueTrip(Guid id, [FromBody] CompleteQueueTripDto dto)
        {
            try
            {
                _logger.LogInformation($"[Queue] CompleteQueueTrip called with id: {id}, dto: {System.Text.Json.JsonSerializer.Serialize(dto)}");

                var queueEntry = await _context.DailyTaxiQueues.FindAsync(id);
                if (queueEntry == null)
                    return NotFound(new { message = "Queue entry not found" });

                if (queueEntry.Status != "Dispatched")
                    return BadRequest(new { message = "Only dispatched trips can be completed" });

                // Find the associated trip
                var trip = await _context.TaxiRankTrips
                    .FirstOrDefaultAsync(t => t.VehicleId == queueEntry.VehicleId 
                        && t.TaxiRankId == queueEntry.TaxiRankId
                        && t.DepartureTime.Date == queueEntry.QueueDate
                        && t.Status != "Completed"
                        && t.Status != "Cancelled");

                if (trip == null)
                    return NotFound(new { message = "No active trip found for this queue entry" });

                // Driver authorization check
                if (dto.CompletedByDriverId.HasValue && dto.CompletedByDriverId.Value != Guid.Empty)
                {
                    if (!trip.DriverId.HasValue || trip.DriverId.Value == Guid.Empty)
                    {
                        return BadRequest(new { message = "This trip has no assigned driver" });
                    }

                    if (trip.DriverId.Value != dto.CompletedByDriverId.Value)
                    {
                        return Forbid();
                    }
                }

                var completedAt = dto.CompletedAt.HasValue
                    ? (dto.CompletedAt.Value.Kind == DateTimeKind.Unspecified
                        ? DateTime.SpecifyKind(dto.CompletedAt.Value, DateTimeKind.Utc)
                        : dto.CompletedAt.Value.ToUniversalTime())
                    : DateTime.UtcNow;

                // Update trip status and completion details
                trip.Status = "Completed";
                trip.ArrivalTime = completedAt;
                trip.CompletedAt = completedAt;
                trip.Latitude = dto.Latitude;
                trip.Longitude = dto.Longitude;
                trip.Notes = string.IsNullOrEmpty(dto.Notes) ? trip.Notes : dto.Notes;
                trip.UpdatedAt = completedAt;

                // Update queue entry status
                queueEntry.Status = "Completed";
                queueEntry.UpdatedAt = completedAt;

                // Get actual passengers and finalize earnings
                var passengers = await _context.TripPassengers
                    .Where(p => p.TaxiRankTripId == trip.Id)
                    .ToListAsync();

                var cashTotal = passengers.Where(p => (p.PaymentMethod ?? "Cash") == "Cash").Sum(p => p.Amount);
                var cardTotal = passengers.Where(p => (p.PaymentMethod ?? "Cash") == "Card").Sum(p => p.Amount);
                var totalEarnings = passengers.Sum(p => p.Amount);

                // Use TotalAmount from DTO as fallback if provided and no passengers exist
                if (totalEarnings == 0 && dto.TotalAmount.HasValue && dto.TotalAmount.Value > 0)
                {
                    totalEarnings = dto.TotalAmount.Value;
                }

                // Update vehicle earnings record
                var routeName = $"{trip.DepartureStation} → {trip.DestinationStation}";
                var earnings = await _context.VehicleEarnings
                    .Where(e => e.VehicleId == trip.VehicleId &&
                               e.Date.Date == trip.DepartureTime.Date &&
                               e.Source == routeName)
                    .OrderByDescending(e => e.CreatedAt)
                    .FirstOrDefaultAsync();

                if (earnings != null)
                {
                    earnings.Amount = totalEarnings;
                    earnings.Description = $"Completed trip: {routeName} | {passengers.Count} passengers | Cash: R{cashTotal}, Card: R{cardTotal}";
                    _context.VehicleEarnings.Update(earnings);
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation($"[Queue] Successfully completed trip {trip.Id} for queue entry {id}");

                return Ok(new
                {
                    message = "Trip completed successfully",
                    tripId = trip.Id,
                    queueEntryId = queueEntry.Id,
                    completedAt,
                    totalEarnings,
                    passengerCount = passengers.Count,
                    cashEarnings = cashTotal,
                    cardEarnings = cardTotal
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[Queue] Error completing trip for queue entry {id}: {ex.Message}");
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        // GET: api/DailyTaxiQueue/driver/{driverId}/dispatched-trips
        [HttpGet("driver/{driverId}/dispatched-trips")]
        public async Task<ActionResult<IEnumerable<object>>> GetDriverDispatchedTrips(Guid driverId, [FromQuery] DateTime? date)
        {
            try
            {
                var query = _context.DailyTaxiQueues
                    .Include(q => q.Vehicle)
                    .Include(q => q.Driver)
                    .Include(q => q.TaxiRank)
                    .Include(q => q.Route)
                    .Where(q => q.DriverId == driverId && q.Status == "Dispatched");

                if (date.HasValue)
                {
                    var targetDate = DateTime.SpecifyKind(date.Value.Date, DateTimeKind.Utc);
                    query = query.Where(q => q.QueueDate == targetDate);
                }

                var dispatchedEntries = await query
                    .OrderByDescending(q => q.DepartedAt)
                    .ToListAsync();

                // Build fallback driver lookup for entries missing Driver nav prop
                var vehicleIdsNoDriver = dispatchedEntries.Where(e => e.Driver == null).Select(e => e.VehicleId).Distinct().ToList();
                var driverNameLookup = new Dictionary<Guid, string>();
                var driverPhoneLookup = new Dictionary<Guid, string>();
                if (vehicleIdsNoDriver.Any())
                {
                    var fallbacks = await _context.DriverProfiles
                        .Where(d => d.AssignedVehicleId != null && vehicleIdsNoDriver.Contains(d.AssignedVehicleId.Value))
                        .Select(d => new { VehicleId = d.AssignedVehicleId!.Value, d.Name, d.Phone })
                        .ToListAsync();
                    foreach (var fb in fallbacks)
                    {
                        driverNameLookup[fb.VehicleId] = fb.Name;
                        driverPhoneLookup[fb.VehicleId] = fb.Phone;
                    }
                }

                var result = dispatchedEntries.Select(entry =>
                {
                    var dn = entry.Driver?.Name;
                    var dp = entry.Driver?.Phone;
                    if (string.IsNullOrEmpty(dn))
                    {
                        driverNameLookup.TryGetValue(entry.VehicleId, out dn);
                        driverPhoneLookup.TryGetValue(entry.VehicleId, out dp);
                    }

                    return new
                    {
                        entry.Id,
                        entry.QueuePosition,
                        entry.DepartedAt,
                        entry.EstimatedDepartureTime,
                        entry.PassengerCount,
                        entry.Notes,
                        DriverName = dn,
                        DriverPhone = dp,
                        Driver = dn != null ? new { name = dn, phone = dp } : null,
                        Vehicle = entry.Vehicle != null ? new
                        {
                            entry.Vehicle.Id,
                            entry.Vehicle.Make,
                            entry.Vehicle.Model,
                            entry.Vehicle.Registration,
                            entry.Vehicle.Type,
                            entry.Vehicle.Capacity
                        } : null,
                        TaxiRank = entry.TaxiRank != null ? new
                        {
                            entry.TaxiRank.Id,
                            entry.TaxiRank.Name,
                            entry.TaxiRank.Code,
                            entry.TaxiRank.Address,
                            entry.TaxiRank.City,
                            entry.TaxiRank.Province
                        } : null,
                        Route = entry.Route != null ? new
                        {
                            entry.Route.Id,
                            entry.Route.RouteName,
                            entry.Route.DepartureStation,
                            entry.Route.DestinationStation,
                            entry.Route.StandardFare
                        } : null,
                        CanComplete = true,
                        TripDetailsUrl = $"/api/DailyTaxiQueue/{entry.Id}/trip-details",
                        CompleteTripUrl = $"/api/DailyTaxiQueue/{entry.Id}/complete-trip"
                    };
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[Queue] Error getting dispatched trips for driver {driverId}: {ex.Message}");
                return StatusCode(500, new { error = ex.Message, details = ex.InnerException?.Message });
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

            // Get all active entries for the same rank/route/date - handle null RouteId gracefully
            var activeEntries = await _context.DailyTaxiQueues
                .Where(q => q.TaxiRankId == entry.TaxiRankId
                    && (entry.RouteId == null || q.RouteId == entry.RouteId)
                    && q.QueueDate == entry.QueueDate
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

                // Shift remaining vehicles up - handle null RouteId gracefully
                var remaining = await _context.DailyTaxiQueues
                    .Where(q => q.TaxiRankId == entry.TaxiRankId
                        && (entry.RouteId == null || q.RouteId == entry.RouteId)
                        && q.QueueDate == entry.QueueDate
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

        // PUT: api/DailyTaxiQueue/{id} — Update queue entry details
        [HttpPut("{id}")]
        public async Task<ActionResult> UpdateQueueEntry(Guid id, [FromBody] UpdateQueueEntryDto dto)
        {
            try
            {
                var entry = await _context.DailyTaxiQueues
                    .Include(q => q.Vehicle)
                    .Include(q => q.Driver)
                    .Include(q => q.Route)
                    .FirstOrDefaultAsync(q => q.Id == id);

                if (entry == null)
                    return NotFound(new { message = "Queue entry not found" });

                if (entry.Status == "Dispatched")
                    return BadRequest(new { message = "Cannot update a dispatched queue entry" });

                if (entry.Status == "Removed")
                    return BadRequest(new { message = "Cannot update a removed queue entry" });

                // Update driver if provided
                if (dto.DriverId.HasValue)
                {
                    if (dto.DriverId.Value != Guid.Empty)
                    {
                        var driver = await _context.DriverProfiles.FindAsync(dto.DriverId.Value);
                        if (driver == null)
                            return BadRequest(new { message = "Driver not found" });
                    }
                    entry.DriverId = dto.DriverId.Value == Guid.Empty ? null : dto.DriverId.Value;
                }

                // Update vehicle if provided
                if (dto.VehicleId.HasValue && dto.VehicleId.Value != Guid.Empty)
                {
                    var vehicle = await _context.Vehicles.FindAsync(dto.VehicleId.Value);
                    if (vehicle == null)
                        return BadRequest(new { message = "Vehicle not found" });

                    // Check if the new vehicle is already in an active queue for the same route today
                    var duplicate = await _context.DailyTaxiQueues
                        .AnyAsync(q => q.VehicleId == dto.VehicleId.Value
                            && q.QueueDate == entry.QueueDate
                            && q.RouteId == entry.RouteId
                            && q.Id != entry.Id
                            && q.Status != "Dispatched" && q.Status != "Removed");

                    if (duplicate)
                        return BadRequest(new { message = "This vehicle is already in the queue for this route today" });

                    entry.VehicleId = dto.VehicleId.Value;
                }

                // Update route if provided
                if (dto.RouteId.HasValue)
                {
                    entry.RouteId = dto.RouteId.Value == Guid.Empty ? null : dto.RouteId.Value;
                }

                // Update estimated departure time if provided
                if (dto.EstimatedDepartureTime.HasValue)
                    entry.EstimatedDepartureTime = dto.EstimatedDepartureTime.Value;

                // Update status if provided (only Waiting <-> Loading transitions)
                if (!string.IsNullOrEmpty(dto.Status))
                {
                    var allowed = new[] { "Waiting", "Loading" };
                    if (!allowed.Contains(dto.Status))
                        return BadRequest(new { message = $"Status can only be changed to: {string.Join(", ", allowed)}" });
                    entry.Status = dto.Status;
                }

                // Update notes if provided
                if (dto.Notes != null)
                    entry.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes;

                entry.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                await _context.SaveChangesAsync();

                // Re-fetch with includes
                var updated = await _context.DailyTaxiQueues
                    .Include(q => q.Vehicle)
                    .Include(q => q.Driver)
                    .Include(q => q.Route)
                    .FirstOrDefaultAsync(q => q.Id == id);

                return Ok(new
                {
                    updated!.Id,
                    updated.TaxiRankId,
                    updated.RouteId,
                    routeName = updated.Route?.RouteName,
                    updated.VehicleId,
                    vehicleRegistration = updated.Vehicle?.Registration,
                    vehicleMake = updated.Vehicle?.Make,
                    vehicleModel = updated.Vehicle?.Model,
                    vehicleCapacity = updated.Vehicle?.Capacity,
                    updated.DriverId,
                    driverName = updated.Driver?.Name,
                    driverPhone = updated.Driver?.Phone,
                    updated.QueueDate,
                    updated.QueuePosition,
                    joinedAt = updated.JoinedAt.ToString(@"hh\:mm"),
                    updated.Status,
                    updated.EstimatedDepartureTime,
                    updated.Notes,
                    updated.CreatedAt,
                    updated.UpdatedAt,
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[Queue] Error updating queue entry {id}: {ex.Message}");
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        // PUT: api/DailyTaxiQueue/{id}/assign-route — Assign or change route for a queue entry
        [HttpPut("{id}/assign-route")]
        public async Task<ActionResult> AssignRoute(Guid id, [FromBody] AssignRouteDto dto)
        {
            try
            {
                var entry = await _context.DailyTaxiQueues.FindAsync(id);
                if (entry == null)
                    return NotFound(new { message = "Queue entry not found" });

                if (entry.Status == "Dispatched" || entry.Status == "Removed")
                    return BadRequest(new { message = "Cannot change route of a dispatched or removed entry" });

                entry.RouteId = dto.RouteId;
                entry.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);

                await _context.SaveChangesAsync();

                return Ok(new { message = "Route assigned", id = entry.Id, routeId = entry.RouteId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[Queue] Error assigning route to entry {id}: {ex.Message}");
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        // GET: api/DailyTaxiQueue/stats/{rankId}?date=2026-03-13
        [HttpGet("stats/{rankId}")]
        public async Task<ActionResult<QueueStatsDto>> GetQueueStats(Guid rankId, [FromQuery] DateTime? date)
        {
            var targetDate = (date ?? DateTime.UtcNow).Date;

            var entries = await _context.DailyTaxiQueues
                .Where(q => q.TaxiRankId == rankId && q.QueueDate == targetDate)
                .ToListAsync();

            var waiting = entries.Count(e => e.Status == "Waiting");
            var dispatched = entries.Count(e => e.Status == "Dispatched");
            var removed = entries.Count(e => e.Status == "Removed");
            var totalPassengers = entries.Where(e => e.Status == "Dispatched").Sum(e => e.PassengerCount);
            var dispatchedEntries = entries.Where(e => e.Status == "Dispatched" && e.DepartedAt.HasValue).ToList();
            var avgWaitMinutes = 0d;
            if (dispatchedEntries.Count > 0)
            {
                avgWaitMinutes = dispatchedEntries
                    .Average(e => (e.DepartedAt!.Value - e.CreatedAt).TotalMinutes);
            }
            
            var result = new QueueStatsDto
            {
                Loading = waiting,
                Dispatched = dispatched,
                Removed = removed,
                Total = entries.Count,
                TotalPassengers = totalPassengers,
                AverageWaitMinutes = Math.Round(avgWaitMinutes, 1)
            };

            return Ok(result);
        }

    public class QueueStatsDto
    {
        public int Loading { get; set; }
        public int Dispatched { get; set; }
        public int Removed { get; set; }
        public int Total { get; set; }
        public int TotalPassengers { get; set; }
        public double AverageWaitMinutes { get; set; }
    }

    public class AddToQueueDto
    {
        public Guid TaxiRankId { get; set; }
        public Guid? RouteId { get; set; }
        public Guid VehicleId { get; set; }
        public Guid? DriverId { get; set; }
        public Guid TenantId { get; set; }
        public DateTime? QueueDate { get; set; }
        public DateTime? EstimatedDepartureTime { get; set; }
        public string? Notes { get; set; }
    }

    public class DispatchDto
    {
        public Guid? DispatchedByUserId { get; set; }
        public int? PassengerCount { get; set; }
        public decimal? FareAmount { get; set; } // Total fare for quick dispatch
        public List<PassengerDto>? Passengers { get; set; }
    }

    public class PassengerDto
    {
        public string? Name { get; set; }
        public string? Contact { get; set; }
        public string? NextOfKinName { get; set; }
        public string? NextOfKinContact { get; set; }
        public string? Destination { get; set; }
        public decimal Amount { get; set; }
        public string? PaymentMethod { get; set; } = "Cash";
        public int? SeatNumber { get; set; }
        public bool FromBooking { get; set; }
    }

        // GET: api/DailyTaxiQueue/owner/{tenantId}/rank-queues?date=2026-03-20
        [HttpGet("owner/{tenantId}/rank-queues")]
        public async Task<ActionResult> GetOwnerRankQueues(Guid tenantId, [FromQuery] DateTime? date)
        {
            try
            {
                var targetDate = DateTime.SpecifyKind((date ?? DateTime.UtcNow).Date, DateTimeKind.Utc);

                // 1. Get all vehicles owned by this tenant
                var ownerVehicleIds = await _context.Vehicles
                    .Where(v => v.TenantId == tenantId)
                    .Select(v => v.Id)
                    .ToListAsync();

                if (!ownerVehicleIds.Any())
                    return Ok(new { date = targetDate, tenantId, ranks = Array.Empty<object>(), message = "No vehicles found for this owner" });

                // 2. Find all taxi rank IDs where owner vehicles are assigned
                var rankIdsFromJunction = await _context.VehicleTaxiRanks
                    .Where(vr => ownerVehicleIds.Contains(vr.VehicleId) && vr.IsActive)
                    .Select(vr => vr.TaxiRankId)
                    .Distinct()
                    .ToListAsync();

                var rankIdsFromVehicle = await _context.Vehicles
                    .Where(v => v.TenantId == tenantId && v.TaxiRankId.HasValue && v.TaxiRankId.Value != Guid.Empty)
                    .Select(v => v.TaxiRankId!.Value)
                    .Distinct()
                    .ToListAsync();

                var allRankIds = rankIdsFromJunction.Union(rankIdsFromVehicle).Distinct().ToList();

                if (!allRankIds.Any())
                    return Ok(new { date = targetDate, tenantId, ranks = Array.Empty<object>(), message = "No vehicles assigned to any taxi rank" });

                // 3. Get rank details
                var ranks = await _context.TaxiRanks
                    .Where(r => allRankIds.Contains(r.Id))
                    .Select(r => new { r.Id, r.Name, r.Code, r.Address, r.City, r.Province })
                    .ToListAsync();

                // 4. Get queue entries for today across all relevant ranks
                var queueEntries = await _context.DailyTaxiQueues
                    .Where(q => allRankIds.Contains(q.TaxiRankId) && q.QueueDate == targetDate && q.Status != "Removed")
                    .Include(q => q.Vehicle)
                    .Include(q => q.Driver)
                    .Include(q => q.Route)
                    .OrderBy(q => q.TaxiRankId)
                    .ThenBy(q => q.Status == "Dispatched" ? 1 : 0)
                    .ThenBy(q => q.QueuePosition)
                    .ToListAsync();

                // 5. Get active trips for owner vehicles
                var activeTrips = await _context.TaxiRankTrips
                    .Where(t => ownerVehicleIds.Contains(t.VehicleId)
                        && t.Status != "Completed" && t.Status != "Cancelled")
                    .Include(t => t.Vehicle)
                    .Include(t => t.Driver)
                    .Include(t => t.Passengers)
                    .OrderByDescending(t => t.DepartureTime)
                    .ToListAsync();

                // 6. Build driver name fallback lookup
                var vehicleIdsNoDriver = queueEntries
                    .Where(e => e.Driver == null)
                    .Select(e => e.VehicleId)
                    .Distinct()
                    .ToList();
                var driverLookup = new Dictionary<Guid, (string Name, string Phone)>();
                if (vehicleIdsNoDriver.Any())
                {
                    var fallbacks = await _context.DriverProfiles
                        .Where(d => d.AssignedVehicleId != null && vehicleIdsNoDriver.Contains(d.AssignedVehicleId.Value))
                        .Select(d => new { VehicleId = d.AssignedVehicleId!.Value, d.Name, d.Phone })
                        .ToListAsync();
                    foreach (var fb in fallbacks)
                        driverLookup[fb.VehicleId] = (fb.Name, fb.Phone);
                }

                var ownerVehicleIdSet = new HashSet<Guid>(ownerVehicleIds);

                // 7. Group by rank
                var result = ranks.Select(rank =>
                {
                    var rankQueue = queueEntries
                        .Where(q => q.TaxiRankId == rank.Id)
                        .Select(q =>
                        {
                            var dn = q.Driver?.Name ?? (driverLookup.ContainsKey(q.VehicleId) ? driverLookup[q.VehicleId].Name : null);
                            var dp = q.Driver?.Phone ?? (driverLookup.ContainsKey(q.VehicleId) ? driverLookup[q.VehicleId].Phone : null);
                            return new
                            {
                                q.Id,
                                q.VehicleId,
                                vehicleRegistration = q.Vehicle?.Registration,
                                vehicleMake = q.Vehicle?.Make,
                                vehicleModel = q.Vehicle?.Model,
                                vehicleCapacity = q.Vehicle?.Capacity,
                                q.DriverId,
                                driverName = dn,
                                driverPhone = dp,
                                q.RouteId,
                                routeName = q.Route?.RouteName,
                                q.QueuePosition,
                                q.Status,
                                joinedAt = q.JoinedAt.ToString(@"hh\:mm"),
                                q.DepartedAt,
                                q.PassengerCount,
                                isOwnerVehicle = ownerVehicleIdSet.Contains(q.VehicleId),
                            };
                        })
                        .ToList();

                    var rankTrips = activeTrips
                        .Where(t => t.TaxiRankId == rank.Id)
                        .Select(t => new
                        {
                            t.Id,
                            t.VehicleId,
                            vehicleRegistration = t.Vehicle?.Registration,
                            t.DriverId,
                            driverName = t.Driver?.Name ?? (driverLookup.ContainsKey(t.VehicleId) ? driverLookup[t.VehicleId].Name : null),
                            t.DepartureStation,
                            t.DestinationStation,
                            t.DepartureTime,
                            t.Status,
                            t.PassengerCount,
                            t.TotalAmount,
                            passengerList = t.Passengers.Select(p => new { p.PassengerName, p.Amount, p.PaymentMethod }).ToList(),
                            isOwnerVehicle = ownerVehicleIdSet.Contains(t.VehicleId),
                        })
                        .ToList();

                    return new
                    {
                        rank = rank,
                        totalInQueue = rankQueue.Count,
                        waitingCount = rankQueue.Count(q => q.Status == "Waiting" || q.Status == "Loading"),
                        dispatchedCount = rankQueue.Count(q => q.Status == "Dispatched"),
                        ownerVehiclesInQueue = rankQueue.Count(q => q.isOwnerVehicle),
                        queue = rankQueue,
                        activeTrips = rankTrips,
                    };
                }).ToList();

                return Ok(new
                {
                    date = targetDate,
                    tenantId,
                    totalVehicles = ownerVehicleIds.Count,
                    totalRanks = result.Count,
                    ranks = result,
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[Queue] Error fetching owner rank queues for tenant {tenantId}");
                return StatusCode(500, new { message = "Failed to load rank queues", error = ex.Message });
            }
        }

    public class ReorderDto
    {
        public int NewPosition { get; set; }
    }

    public class AssignRouteDto
    {
        public Guid? RouteId { get; set; }
    }

    public class UpdateQueueEntryDto
    {
        public Guid? DriverId { get; set; }
        public Guid? VehicleId { get; set; }
        public Guid? RouteId { get; set; }
        public DateTime? EstimatedDepartureTime { get; set; }
        public string? Status { get; set; }
        public string? Notes { get; set; }
    }

    public class CompleteQueueTripDto
    {
        public string Notes { get; set; } = string.Empty;
        public Guid? CompletedByDriverId { get; set; }
        public DateTime? CompletedAt { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public decimal? TotalAmount { get; set; }
    }

    }
}
