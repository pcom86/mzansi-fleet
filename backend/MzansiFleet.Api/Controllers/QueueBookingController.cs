using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Repository;
using MzansiFleet.Domain.Entities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using MzansiFleet.Api.Services;
using Microsoft.AspNetCore.SignalR;
using MzansiFleet.Api.Hubs;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QueueBookingController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;
        private readonly ILogger<QueueBookingController> _logger;
        private readonly IConfiguration _configuration;
        private readonly OzowService _ozowService;
        private readonly IHubContext<QueueHub> _hubContext;

        public QueueBookingController(MzansiFleetDbContext context, ILogger<QueueBookingController> logger, IConfiguration configuration, OzowService ozowService, IHubContext<QueueHub> hubContext)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _ozowService = ozowService;
            _hubContext = hubContext;
        }

        // GET: api/QueueBooking/rank/{rankId}/live-queue?date=2026-03-23
        // Public endpoint for riders to view live queue at a taxi rank
        [HttpGet("rank/{rankId}/live-queue")]
        public async Task<ActionResult> GetLiveQueue(Guid rankId, [FromQuery] string? date)
        {
            try
            {
                var today = string.IsNullOrWhiteSpace(date)
                    ? DateTime.UtcNow.Date
                    : DateTime.Parse(date).Date;
                today = DateTime.SpecifyKind(today, DateTimeKind.Utc);

                var queueEntries = await _context.DailyTaxiQueues
                    .Include(q => q.Vehicle)
                    .Include(q => q.Driver)
                    .Include(q => q.Route)
                        .ThenInclude(r => r.Stops)
                    .Where(q => q.TaxiRankId == rankId
                        && q.QueueDate == today
                        && (q.Status == "Waiting" || q.Status == "Loading"))
                    .OrderBy(q => q.QueuePosition)
                    .ToListAsync();

                // For entries with no RouteId, resolve route from vehicle's RouteVehicle assignment
                var noRouteVehicleIds = queueEntries
                    .Where(q => q.RouteId == null)
                    .Select(q => q.VehicleId)
                    .Distinct()
                    .ToList();

                var vehicleRouteLookup = new Dictionary<Guid, MzansiFleet.Domain.Entities.Route>();
                if (noRouteVehicleIds.Any())
                {
                    vehicleRouteLookup = await _context.RouteVehicles
                        .Include(rv => rv.Route)
                            .ThenInclude(r => r.Stops)
                        .Where(rv => noRouteVehicleIds.Contains(rv.VehicleId) && rv.IsActive)
                        .GroupBy(rv => rv.VehicleId)
                        .Select(g => g.First())
                        .ToDictionaryAsync(rv => rv.VehicleId, rv => rv.Route!);
                }

                // Get existing bookings for these queue entries to calculate available seats
                var queueIds = queueEntries.Select(q => q.Id).ToList();
                var existingBookings = await _context.QueueBookings
                    .Where(b => queueIds.Contains(b.QueueEntryId)
                        && b.Status != "Cancelled" && b.Status != "Expired")
                    .GroupBy(b => b.QueueEntryId)
                    .Select(g => new { QueueEntryId = g.Key, BookedSeats = g.Sum(b => b.SeatsBooked) })
                    .ToListAsync();

                var bookingLookup = existingBookings.ToDictionary(b => b.QueueEntryId, b => b.BookedSeats);

                var result = queueEntries.Select(q =>
                {
                    var capacity = q.Vehicle?.Capacity ?? 0;
                    var booked = bookingLookup.ContainsKey(q.Id) ? bookingLookup[q.Id] : 0;
                    var route = q.Route ?? (vehicleRouteLookup.ContainsKey(q.VehicleId) ? vehicleRouteLookup[q.VehicleId] : null);
                    return new
                    {
                        q.Id,
                        q.QueuePosition,
                        q.Status,
                        RouteId = q.RouteId ?? route?.Id,
                        routeName = route?.RouteName,
                        departureStation = route?.DepartureStation,
                        destinationStation = route?.DestinationStation,
                        standardFare = route?.StandardFare ?? 0,
                        routeStops = (route?.Stops ?? new List<MzansiFleet.Domain.Entities.RouteStop>())
                            .OrderBy(s => s.StopOrder)
                            .Select(s => new {
                                s.Id,
                                s.StopName,
                                s.StopOrder,
                                s.FareFromOrigin,
                                s.EstimatedMinutesFromDeparture,
                            }).ToList(),
                        vehicleId = q.VehicleId,
                        vehicleRegistration = q.Vehicle?.Registration,
                        vehicleMake = q.Vehicle?.Make,
                        vehicleModel = q.Vehicle?.Model,
                        vehicleCapacity = capacity,
                        driverName = q.Driver != null
                            ? q.Driver.Name
                            : _context.DriverProfiles
                                .Where(d => d.AssignedVehicleId == q.VehicleId)
                                .Select(d => d.Name)
                                .FirstOrDefault(),
                        estimatedDepartureTime = q.EstimatedDepartureTime,
                        joinedAt = q.JoinedAt.ToString(@"hh\:mm"),
                        seatsBooked = booked,
                        seatsAvailable = capacity > 0 ? Math.Max(0, capacity - q.PassengerCount - booked) : 0,
                    };
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[QueueBooking] Error fetching live queue for rank {RankId}", rankId);
                return StatusCode(500, new { message = "Failed to load queue data" });
            }
        }

        // GET: api/QueueBooking/ranks — List taxi ranks with active queue counts
        [HttpGet("ranks")]
        public async Task<ActionResult> GetRanksWithQueues()
        {
            try
            {
                var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);

                var allRanks = await _context.TaxiRanks.ToListAsync();
                _logger.LogInformation("[QueueBooking] Found {Count} total taxi ranks in database", allRanks.Count);
                
                var ranks = await _context.TaxiRanks
                    .Select(r => new
                    {
                        r.Id,
                        r.Name,
                        r.Address,
                        r.City,
                        r.Province,
                        r.Latitude,
                        r.Longitude,
                        activeVehicles = _context.DailyTaxiQueues
                            .Count(q => q.TaxiRankId == r.Id && q.QueueDate == today
                                && (q.Status == "Waiting" || q.Status == "Loading")),
                    })
                    // .Where(r => r.activeVehicles > 0) // Commented out to show all ranks for debugging
                    .OrderByDescending(r => r.activeVehicles)
                    .ToListAsync();

                _logger.LogInformation("[QueueBooking] Returning {Count} ranks to client", ranks.Count);
                return Ok(ranks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[QueueBooking] Error fetching ranks with queues");
                return StatusCode(500, new { message = "Failed to load ranks" });
            }
        }

        // POST: api/QueueBooking — Create a queue booking with EFT payment
        [HttpPost]
        public async Task<ActionResult> CreateQueueBooking([FromBody] CreateQueueBookingDto dto)
        {
            try
            {
                // Validate queue entry exists and is active
                var queueEntry = await _context.DailyTaxiQueues
                    .Include(q => q.Vehicle)
                    .Include(q => q.Route)
                    .FirstOrDefaultAsync(q => q.Id == dto.QueueEntryId);

                if (queueEntry == null)
                    return NotFound(new { message = "Queue entry not found" });

                if (queueEntry.Status == "Dispatched" || queueEntry.Status == "Removed")
                    return BadRequest(new { message = "This vehicle has already departed or been removed from the queue" });

                // Check seat availability
                var capacity = queueEntry.Vehicle?.Capacity ?? 0;
                var currentlyBooked = await _context.QueueBookings
                    .Where(b => b.QueueEntryId == dto.QueueEntryId
                        && b.Status != "Cancelled" && b.Status != "Expired")
                    .SumAsync(b => b.SeatsBooked);

                var availableSeats = capacity - queueEntry.PassengerCount - currentlyBooked;
                if (dto.SeatsBooked > availableSeats)
                    return BadRequest(new { message = $"Only {availableSeats} seat(s) available. You requested {dto.SeatsBooked}." });

                // Resolve route: from queue entry directly, or via vehicle's RouteVehicle assignment
                var route = queueEntry.Route;
                var resolvedRouteId = queueEntry.RouteId;
                if (route == null)
                {
                    var rv = await _context.RouteVehicles
                        .Include(rv => rv.Route)
                            .ThenInclude(r => r.Stops)
                        .FirstOrDefaultAsync(rv => rv.VehicleId == queueEntry.VehicleId && rv.IsActive);
                    if (rv?.Route != null)
                    {
                        route = rv.Route;
                        resolvedRouteId = rv.RouteId;
                    }
                }

                // Calculate fare: use per-passenger fares from frontend, fallback to route standard fare
                var farePerSeat = route?.StandardFare ?? 0;
                var passengerFareTotal = dto.Passengers?.Sum(p => p.Fare) ?? 0;
                var totalFare = passengerFareTotal > 0 ? passengerFareTotal
                    : dto.TotalFare > 0 ? dto.TotalFare
                    : farePerSeat * dto.SeatsBooked;
                if (farePerSeat == 0 && dto.Passengers?.Count > 0)
                    farePerSeat = Math.Round(totalFare / dto.Passengers.Count, 2);

                // Generate EFT payment reference
                var paymentRef = $"MF-Q{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";

                var booking = new QueueBooking
                {
                    Id = Guid.NewGuid(),
                    UserId = dto.UserId,
                    QueueEntryId = dto.QueueEntryId,
                    TaxiRankId = queueEntry.TaxiRankId,
                    RouteId = resolvedRouteId,
                    VehicleId = queueEntry.VehicleId,
                    SeatsBooked = dto.SeatsBooked,
                    TotalFare = totalFare,
                    PaymentMethod = dto.PaymentMethod ?? "EFT",
                    PaymentStatus = "Pending",
                    PaymentReference = paymentRef,
                    Status = "Pending",
                    Notes = dto.Notes,
                    CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc),
                };

                _context.QueueBookings.Add(booking);

                // Add passengers
                var routeStops = route?.Stops?.OrderBy(s => s.StopOrder).ToList();
                if (dto.Passengers?.Count > 0)
                {
                    foreach (var p in dto.Passengers)
                    {
                        var passengerFare = p.Fare;
                        if (passengerFare <= 0 && routeStops != null && !string.IsNullOrWhiteSpace(p.Destination))
                        {
                            var stop = routeStops.FirstOrDefault(s =>
                                string.Equals(s.StopName, p.Destination.Trim(), StringComparison.OrdinalIgnoreCase));
                            if (stop != null)
                                passengerFare = stop.FareFromOrigin;
                        }
                        if (passengerFare <= 0)
                            passengerFare = farePerSeat;

                        _context.QueueBookingPassengers.Add(new QueueBookingPassenger
                        {
                            Id = Guid.NewGuid(),
                            QueueBookingId = booking.Id,
                            Name = p.Name?.Trim() ?? "",
                            ContactNumber = p.ContactNumber?.Trim() ?? "",
                            Email = p.Email?.Trim(),
                            Destination = p.Destination?.Trim(),
                            Fare = passengerFare,
                            NextOfKinName = p.NextOfKinName?.Trim(),
                            NextOfKinContact = p.NextOfKinContact?.Trim(),
                            CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc),
                        });
                    }
                }

                await _context.SaveChangesAsync();

                // --- Notify taxi rank admins and marshals about the new booking ---
                await NotifyRankStaffOfBooking(booking, queueEntry, dto);

                // --- SignalR real-time notification ---
                await _hubContext.Clients.Group($"rank_{queueEntry.TaxiRankId}")
                    .SendAsync("NewBooking", new
                    {
                        bookingId = booking.Id,
                        queueEntryId = booking.QueueEntryId,
                        vehicleRegistration = queueEntry.Vehicle?.Registration,
                        seatsBooked = booking.SeatsBooked,
                        totalFare = booking.TotalFare,
                        passengerCount = dto.Passengers?.Count ?? 0,
                        paymentMethod = booking.PaymentMethod,
                        createdAt = booking.CreatedAt,
                    });

                _logger.LogInformation("[QueueBooking] Created booking {BookingId} for queue {QueueId}, {Seats} seat(s), Fare: R{Fare}, Ref: {Ref}",
                    booking.Id, dto.QueueEntryId, dto.SeatsBooked, totalFare, paymentRef);

                return Ok(new
                {
                    booking.Id,
                    booking.QueueEntryId,
                    booking.SeatsBooked,
                    booking.TotalFare,
                    farePerSeat,
                    booking.PaymentMethod,
                    booking.PaymentStatus,
                    booking.PaymentReference,
                    booking.Status,
                    vehicleRegistration = queueEntry.Vehicle?.Registration,
                    routeName = queueEntry.Route?.RouteName,
                    departureStation = queueEntry.Route?.DepartureStation,
                    destinationStation = queueEntry.Route?.DestinationStation,
                    // EFT banking details for the rider
                    eftDetails = new
                    {
                        accountName = "Mzansi Fleet (Pty) Ltd",
                        bank = "FNB",
                        accountNumber = "62912345678",
                        branchCode = "250655",
                        reference = paymentRef,
                    },
                    booking.CreatedAt,
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[QueueBooking] Error creating booking");
                return StatusCode(500, new { message = "Failed to create booking" });
            }
        }

        // PUT: api/QueueBooking/{id}/confirm-payment — Rider confirms EFT payment was made
        [HttpPut("{id}/confirm-payment")]
        public async Task<ActionResult> ConfirmPayment(Guid id, [FromBody] ConfirmPaymentDto dto)
        {
            try
            {
                var booking = await _context.QueueBookings.FindAsync(id);
                if (booking == null)
                    return NotFound(new { message = "Booking not found" });

                if (booking.Status == "Cancelled")
                    return BadRequest(new { message = "This booking has been cancelled" });

                booking.PaymentStatus = "Awaiting Verification";
                booking.BankReference = dto.BankReference;
                booking.Status = "Confirmed";
                booking.ConfirmedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                booking.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);

                await _context.SaveChangesAsync();

                _logger.LogInformation("[QueueBooking] Payment confirmed for booking {BookingId}, BankRef: {BankRef}",
                    id, dto.BankReference);

                return Ok(new
                {
                    message = "Payment confirmation received",
                    booking.Id,
                    booking.PaymentStatus,
                    booking.Status,
                    booking.PaymentReference,
                    booking.BankReference,
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[QueueBooking] Error confirming payment for booking {BookingId}", id);
                return StatusCode(500, new { message = "Failed to confirm payment" });
            }
        }

        // POST: api/QueueBooking/{id}/ozow-payment — Initiate Ozow EFT payment for a booking
        [HttpPost("{id}/ozow-payment")]
        public async Task<ActionResult> InitiateOzowPayment(Guid id)
        {
            try
            {
                var booking = await _context.QueueBookings
                    .Include(b => b.User)
                    .FirstOrDefaultAsync(b => b.Id == id);

                if (booking == null)
                    return NotFound(new { message = "Booking not found" });

                if (booking.Status == "Cancelled")
                    return BadRequest(new { message = "This booking has been cancelled" });

                if (booking.PaymentStatus == "Paid")
                    return BadRequest(new { message = "This booking is already paid" });

                var customerEmail = booking.User?.Email ?? "";
                var paymentRef = booking.PaymentReference ?? $"MF-Q{DateTime.UtcNow:yyyyMMdd}-{booking.Id.ToString("N")[..6].ToUpper()}";

                var request = _ozowService.GeneratePaymentRequest(
                    transactionReference: paymentRef,
                    bankReference: paymentRef,
                    amount: booking.TotalFare,
                    customerEmail: customerEmail
                );

                var paymentUrl = _ozowService.GetPaymentUrl(request);

                // Update booking to reflect Ozow payment method
                booking.PaymentMethod = "Ozow";
                booking.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                await _context.SaveChangesAsync();

                _logger.LogInformation("[QueueBooking] Ozow payment initiated for booking {BookingId}, ref: {Ref}, amount: {Amount}",
                    id, paymentRef, booking.TotalFare);

                return Ok(new
                {
                    paymentUrl,
                    transactionReference = paymentRef,
                    amount = booking.TotalFare,
                    booking.Id,
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[QueueBooking] Error initiating Ozow payment for booking {BookingId}", id);
                return StatusCode(500, new { message = "Failed to initiate payment" });
            }
        }

        // POST: api/QueueBooking/ozow-notify — Ozow server-to-server webhook notification
        [HttpPost("ozow-notify")]
        public async Task<ActionResult> OzowNotify([FromForm] OzowNotification notification)
        {
            try
            {
                _logger.LogInformation("[Ozow] Notification received: Ref={Ref}, Status={Status}, Amount={Amount}",
                    notification.TransactionReference, notification.Status, notification.Amount);

                // Validate the hash to ensure this is a legitimate Ozow notification
                if (!_ozowService.ValidateNotificationHash(notification))
                {
                    _logger.LogWarning("[Ozow] Invalid hash for notification ref={Ref}", notification.TransactionReference);
                    return BadRequest(new { message = "Invalid hash" });
                }

                // Find the booking by payment reference
                var booking = await _context.QueueBookings
                    .FirstOrDefaultAsync(b => b.PaymentReference == notification.TransactionReference);

                if (booking == null)
                {
                    _logger.LogWarning("[Ozow] Booking not found for ref={Ref}", notification.TransactionReference);
                    return NotFound(new { message = "Booking not found" });
                }

                // Update booking based on Ozow status
                var ozowStatus = (notification.Status ?? "").ToLower();
                switch (ozowStatus)
                {
                    case "complete":
                        booking.PaymentStatus = "Paid";
                        booking.Status = "Confirmed";
                        booking.BankReference = notification.TransactionId;
                        booking.PaidAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                        booking.ConfirmedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                        _logger.LogInformation("[Ozow] Payment COMPLETE for booking {BookingId}", booking.Id);
                        break;

                    case "cancelled":
                        booking.PaymentStatus = "Cancelled";
                        _logger.LogInformation("[Ozow] Payment CANCELLED for booking {BookingId}", booking.Id);
                        break;

                    case "error":
                        booking.PaymentStatus = "Failed";
                        _logger.LogWarning("[Ozow] Payment ERROR for booking {BookingId}: {Msg}", booking.Id, notification.StatusMessage);
                        break;

                    case "pendingInvestigation":
                        booking.PaymentStatus = "PendingInvestigation";
                        _logger.LogInformation("[Ozow] Payment PENDING INVESTIGATION for booking {BookingId}", booking.Id);
                        break;

                    default:
                        _logger.LogWarning("[Ozow] Unknown status '{Status}' for booking {BookingId}", notification.Status, booking.Id);
                        break;
                }

                booking.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                await _context.SaveChangesAsync();

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Ozow] Error processing notification");
                return StatusCode(500);
            }
        }

        // GET: api/QueueBooking/{id}/payment-status — Check payment status (polled by mobile app)
        [HttpGet("{id}/payment-status")]
        public async Task<ActionResult> GetPaymentStatus(Guid id)
        {
            var booking = await _context.QueueBookings
                .Select(b => new { b.Id, b.PaymentStatus, b.Status, b.PaymentMethod, b.PaidAt })
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null)
                return NotFound(new { message = "Booking not found" });

            return Ok(new
            {
                booking.Id,
                booking.PaymentStatus,
                booking.Status,
                booking.PaymentMethod,
                booking.PaidAt,
                isPaid = booking.PaymentStatus == "Paid",
            });
        }

        // POST: api/QueueBooking/{id}/simulate-payment — DEV ONLY: simulate a successful Ozow payment
        [HttpPost("{id}/simulate-payment")]
        public async Task<ActionResult> SimulatePayment(Guid id)
        {
            var booking = await _context.QueueBookings.FindAsync(id);
            if (booking == null)
                return NotFound(new { message = "Booking not found" });

            booking.PaymentStatus = "Paid";
            booking.Status = "Confirmed";
            booking.PaymentMethod = "Ozow";
            booking.BankReference = $"SIM-{Guid.NewGuid().ToString("N")[..8].ToUpper()}";
            booking.PaidAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
            booking.ConfirmedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
            booking.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);

            await _context.SaveChangesAsync();

            _logger.LogInformation("[QueueBooking] SIMULATED payment for booking {BookingId}, TotalFare: R{Fare}",
                id, booking.TotalFare);

            return Ok(new
            {
                message = "Payment simulated successfully",
                booking.Id,
                booking.PaymentStatus,
                booking.Status,
                booking.TotalFare,
                booking.PaidAt,
                isPaid = true,
            });
        }

        // GET: api/QueueBooking/user/{userId} — Get rider's queue bookings
        [HttpGet("user/{userId}")]
        public async Task<ActionResult> GetUserBookings(Guid userId)
        {
            try
            {
                var checkInWindow = _configuration.GetValue<int>("BookingSettings:CheckInWindowMinutes", 60);
                var updateCutoff = _configuration.GetValue<int>("BookingSettings:UpdateBookingCutoffMinutes", 60);

                var bookings = await _context.QueueBookings
                    .Include(b => b.Vehicle)
                    .Include(b => b.Route)
                    .Include(b => b.TaxiRank)
                    .Include(b => b.QueueEntry)
                    .Include(b => b.Passengers)
                    .Where(b => b.UserId == userId)
                    .OrderByDescending(b => b.CreatedAt)
                    .Select(b => new
                    {
                        b.Id,
                        b.QueueEntryId,
                        b.RouteId,
                        b.TaxiRankId,
                        b.SeatsBooked,
                        b.TotalFare,
                        b.PaymentMethod,
                        b.PaymentStatus,
                        b.PaymentReference,
                        b.BankReference,
                        b.Status,
                        b.Notes,
                        b.CreatedAt,
                        b.ConfirmedAt,
                        b.CheckedInAt,
                        checkInWindowMinutes = checkInWindow,
                        updateCutoffMinutes = updateCutoff,
                        taxiRankName = b.TaxiRank != null ? b.TaxiRank.Name : null,
                        routeName = b.Route != null ? b.Route.RouteName : null,
                        departureStation = b.Route != null ? b.Route.DepartureStation : null,
                        destinationStation = b.Route != null ? b.Route.DestinationStation : null,
                        vehicleRegistration = b.Vehicle != null ? b.Vehicle.Registration : null,
                        vehicleMake = b.Vehicle != null ? b.Vehicle.Make : null,
                        vehicleModel = b.Vehicle != null ? b.Vehicle.Model : null,
                        queueDate = b.QueueEntry != null ? b.QueueEntry.QueueDate : (DateTime?)null,
                        queueStatus = b.QueueEntry != null ? b.QueueEntry.Status : null,
                        queuePosition = b.QueueEntry != null ? b.QueueEntry.QueuePosition : (int?)null,
                        estimatedDepartureTime = b.QueueEntry != null ? b.QueueEntry.EstimatedDepartureTime : (DateTime?)null,
                        passengers = b.Passengers.Select(p => new
                        {
                            p.Id,
                            p.Name,
                            p.ContactNumber,
                            p.Email,
                            p.Destination,
                            p.Fare,
                            p.SeatNumber,
                            p.NextOfKinName,
                            p.NextOfKinContact,
                        }).ToList(),
                    })
                    .ToListAsync();

                return Ok(bookings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[QueueBooking] Error fetching bookings for user {UserId}", userId);
                return StatusCode(500, new { message = "Failed to load bookings" });
            }
        }

        // PUT: api/QueueBooking/{id}/update — Update passengers on an existing booking
        [HttpPut("{id}/update")]
        public async Task<ActionResult> UpdateBooking(Guid id, [FromBody] UpdateQueueBookingDto dto)
        {
            try
            {
                var booking = await _context.QueueBookings
                    .Include(b => b.Passengers)
                    .Include(b => b.QueueEntry)
                    .Include(b => b.Vehicle)
                    .Include(b => b.Route)
                    .FirstOrDefaultAsync(b => b.Id == id);

                if (booking == null)
                    return NotFound(new { message = "Booking not found" });

                if (booking.Status == "Cancelled" || booking.Status == "Completed")
                    return BadRequest(new { message = $"Cannot update a {booking.Status.ToLower()} booking" });

                // Enforce cutoff: no updates within X minutes of departure
                var cutoffMinutes = _configuration.GetValue<int>("BookingSettings:UpdateBookingCutoffMinutes", 60);
                var etd = booking.QueueEntry?.EstimatedDepartureTime;
                if (etd.HasValue)
                {
                    var now = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                    var cutoff = etd.Value.AddMinutes(-cutoffMinutes);
                    if (now >= cutoff)
                    {
                        var minutesLeft = Math.Max(0, (int)(etd.Value - now).TotalMinutes);
                        return BadRequest(new { message = $"Booking updates are locked {cutoffMinutes} minutes before departure. Departure is in {minutesLeft} minute(s).", cutoffMinutes });
                    }
                }

                // Validate seat availability if increasing seats
                if (dto.Passengers != null && dto.Passengers.Count > booking.SeatsBooked)
                {
                    var vehicleCapacity = booking.Vehicle?.Capacity ?? 0;
                    if (vehicleCapacity > 0)
                    {
                        var otherBookedSeats = await _context.QueueBookings
                            .Where(b => b.QueueEntryId == booking.QueueEntryId
                                     && b.Id != booking.Id
                                     && b.Status != "Cancelled")
                            .SumAsync(b => b.SeatsBooked);
                        var trueAvailable = vehicleCapacity - otherBookedSeats;
                        if (dto.Passengers.Count > trueAvailable)
                        {
                            return BadRequest(new { message = $"Only {trueAvailable} seat(s) available. You requested {dto.Passengers.Count}." });
                        }
                    }
                }

                // Remove old passengers
                _context.QueueBookingPassengers.RemoveRange(booking.Passengers);

                // Add updated passengers
                var newPassengers = (dto.Passengers ?? new List<QueueBookingPassengerDto>()).Select(p => new QueueBookingPassenger
                {
                    Id = Guid.NewGuid(),
                    QueueBookingId = booking.Id,
                    Name = p.Name?.Trim() ?? string.Empty,
                    ContactNumber = p.ContactNumber?.Trim() ?? string.Empty,
                    Email = p.Email?.Trim(),
                    Destination = p.Destination?.Trim(),
                    Fare = p.Fare,
                    NextOfKinName = p.NextOfKinName?.Trim(),
                    NextOfKinContact = p.NextOfKinContact?.Trim(),
                    CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc),
                }).ToList();

                await _context.QueueBookingPassengers.AddRangeAsync(newPassengers);

                // Update booking totals
                var newTotalFare = newPassengers.Sum(p => p.Fare);
                var oldSeats = booking.SeatsBooked;
                booking.SeatsBooked = newPassengers.Count;
                booking.TotalFare = newTotalFare;
                booking.Notes = dto.Notes ?? booking.Notes;
                booking.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);

                await _context.SaveChangesAsync();

                _logger.LogInformation("[QueueBooking] Updated booking {BookingId}: {OldSeats}->{NewSeats} seats, Fare: R{Fare}",
                    id, oldSeats, newPassengers.Count, newTotalFare);

                return Ok(new
                {
                    booking.Id,
                    booking.SeatsBooked,
                    booking.TotalFare,
                    booking.Status,
                    updatedAt = booking.UpdatedAt,
                    passengers = newPassengers.Select(p => new
                    {
                        p.Id,
                        p.Name,
                        p.ContactNumber,
                        p.Email,
                        p.Destination,
                        p.Fare,
                        p.NextOfKinName,
                        p.NextOfKinContact,
                    }).ToList(),
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[QueueBooking] Error updating booking {BookingId}", id);
                return StatusCode(500, new { message = "Failed to update booking" });
            }
        }

        // PUT: api/QueueBooking/{id}/cancel — Cancel a queue booking
        [HttpPut("{id}/cancel")]
        public async Task<ActionResult> CancelBooking(Guid id, [FromBody] CancelQueueBookingDto? dto)
        {
            try
            {
                var booking = await _context.QueueBookings.FindAsync(id);
                if (booking == null)
                    return NotFound(new { message = "Booking not found" });

                if (booking.Status == "Completed")
                    return BadRequest(new { message = "Cannot cancel a completed booking" });

                booking.Status = "Cancelled";
                booking.CancellationReason = dto?.Reason ?? "Cancelled by user";
                booking.CancelledAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                booking.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);

                await _context.SaveChangesAsync();

                _logger.LogInformation("[QueueBooking] Cancelled booking {BookingId}, Reason: {Reason}", id, dto?.Reason);

                return Ok(new { message = "Booking cancelled successfully", booking.Id, booking.Status });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[QueueBooking] Error cancelling booking {BookingId}", id);
                return StatusCode(500, new { message = "Failed to cancel booking" });
            }
        }

        // PUT: api/QueueBooking/{id}/check-in — Rider checks in at the taxi rank
        [HttpPut("{id}/check-in")]
        public async Task<ActionResult> CheckIn(Guid id)
        {
            try
            {
                var booking = await _context.QueueBookings
                    .Include(b => b.QueueEntry)
                    .FirstOrDefaultAsync(b => b.Id == id);
                if (booking == null)
                    return NotFound(new { message = "Booking not found" });

                if (booking.CheckedInAt.HasValue)
                    return BadRequest(new { message = "Already checked in" });

                if (booking.Status == "Cancelled" || booking.Status == "Expired")
                    return BadRequest(new { message = $"Cannot check in a {booking.Status.ToLower()} booking" });

                // Check if within check-in window
                var windowMinutes = _configuration.GetValue<int>("BookingSettings:CheckInWindowMinutes", 60);
                var etd = booking.QueueEntry?.EstimatedDepartureTime;
                if (etd.HasValue)
                {
                    var now = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                    var windowOpen = etd.Value.AddMinutes(-windowMinutes);
                    if (now < windowOpen)
                    {
                        var minutesUntilWindow = (int)(windowOpen - now).TotalMinutes;
                        return BadRequest(new { message = $"Check-in opens {minutesUntilWindow} minute(s) before departure. Please try again later." });
                    }
                }

                booking.CheckedInAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                booking.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                if (booking.Status == "Pending" || booking.Status == "Confirmed")
                    booking.Status = "CheckedIn";

                await _context.SaveChangesAsync();

                _logger.LogInformation("[QueueBooking] Rider checked in for booking {BookingId}", id);
                return Ok(new { message = "Checked in successfully", booking.Id, booking.Status, booking.CheckedInAt });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[QueueBooking] Error checking in booking {BookingId}", id);
                return StatusCode(500, new { message = "Failed to check in" });
            }
        }

        // GET: api/QueueBooking/queue-entry/{queueEntryId}/bookings — Get all bookings for a queue entry (Admin/Marshal)
        [HttpGet("queue-entry/{queueEntryId}/bookings")]
        public async Task<ActionResult> GetBookingsForQueueEntry(Guid queueEntryId)
        {
            try
            {
                var bookingEntities = await _context.QueueBookings
                    .Include(b => b.Passengers)
                    .Include(b => b.User)
                    .Include(b => b.Route)
                        .ThenInclude(r => r.Stops)
                    .Include(b => b.Vehicle)
                    .Include(b => b.QueueEntry)
                        .ThenInclude(q => q.Route)
                            .ThenInclude(r => r!.Stops)
                    .Where(b => b.QueueEntryId == queueEntryId && b.Status != "Cancelled" && b.Status != "Expired")
                    .OrderBy(b => b.CreatedAt)
                    .ToListAsync();

                // Resolve route from RouteVehicles if neither booking nor queue entry has a route
                MzansiFleet.Domain.Entities.Route? fallbackRoute = null;
                if (bookingEntities.Any())
                {
                    var first = bookingEntities.First();
                    var resolvedRoute = first.Route ?? first.QueueEntry?.Route;
                    if (resolvedRoute == null)
                    {
                        var vehicleId = first.VehicleId != Guid.Empty ? first.VehicleId
                            : first.QueueEntry?.VehicleId ?? Guid.Empty;
                        if (vehicleId != Guid.Empty)
                        {
                            fallbackRoute = await _context.RouteVehicles
                                .Include(rv => rv.Route)
                                    .ThenInclude(r => r.Stops)
                                .Where(rv => rv.VehicleId == vehicleId && rv.IsActive)
                                .Select(rv => rv.Route)
                                .FirstOrDefaultAsync();
                        }
                    }
                }

                var bookings = bookingEntities.Select(b =>
                {
                    var route = b.Route ?? b.QueueEntry?.Route ?? fallbackRoute;
                    var routeStops = route?.Stops?.OrderBy(s => s.StopOrder).ToList();

                    // Resolve per-passenger fare from route stops when stored fare is 0
                    var passengers = b.Passengers.Select(p =>
                    {
                        var fare = p.Fare;
                        if (fare == 0 && routeStops != null && !string.IsNullOrEmpty(p.Destination))
                        {
                            var matchingStop = routeStops.FirstOrDefault(s =>
                                string.Equals(s.StopName, p.Destination, StringComparison.OrdinalIgnoreCase));
                            if (matchingStop != null)
                                fare = matchingStop.FareFromOrigin;
                        }
                        if (fare == 0 && route != null)
                            fare = route.StandardFare;
                        return new
                        {
                            p.Id,
                            p.Name,
                            p.ContactNumber,
                            p.Destination,
                            Fare = fare,
                            p.SeatNumber,
                            p.NextOfKinName,
                            p.NextOfKinContact,
                        };
                    }).ToList();

                    var totalFare = b.TotalFare > 0 ? b.TotalFare : passengers.Sum(p => p.Fare);

                    return new
                    {
                        b.Id,
                        b.UserId,
                        riderName = b.User?.FullName,
                        riderPhone = b.User?.Phone,
                        b.SeatsBooked,
                        totalFare,
                        b.PaymentMethod,
                        b.PaymentStatus,
                        b.PaymentReference,
                        b.Status,
                        b.CreatedAt,
                        b.ConfirmedAt,
                        vehicleRegistration = b.Vehicle?.Registration ?? b.QueueEntry?.Vehicle?.Registration,
                        routeName = route?.RouteName,
                        departureStation = route?.DepartureStation,
                        destinationStation = route?.DestinationStation,
                        passengers,
                    };
                }).ToList();

                var totalBookedSeats = bookings.Sum(b => b.SeatsBooked);

                return Ok(new { bookings, totalBookedSeats });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[QueueBooking] Error fetching bookings for queue entry {QueueEntryId}", queueEntryId);
                return StatusCode(500, new { message = "Failed to load bookings" });
            }
        }

        // PUT: api/QueueBooking/{id}/allocate-seats — Admin/Marshal allocates seat numbers to passengers
        [HttpPut("{id}/allocate-seats")]
        public async Task<ActionResult> AllocateSeats(Guid id, [FromBody] AllocateSeatsDto dto)
        {
            try
            {
                var booking = await _context.QueueBookings
                    .Include(b => b.Passengers)
                    .Include(b => b.QueueEntry)
                        .ThenInclude(q => q.Vehicle)
                    .FirstOrDefaultAsync(b => b.Id == id);

                if (booking == null)
                    return NotFound(new { message = "Booking not found" });

                if (booking.Status == "Cancelled")
                    return BadRequest(new { message = "Cannot allocate seats for a cancelled booking" });

                var vehicleCapacity = booking.QueueEntry?.Vehicle?.Capacity ?? 0;

                // Validate seat numbers aren't already taken by other bookings on the same queue entry
                var otherPassengerSeats = await _context.QueueBookingPassengers
                    .Where(p => p.QueueBooking.QueueEntryId == booking.QueueEntryId
                        && p.QueueBookingId != booking.Id
                        && p.SeatNumber.HasValue
                        && p.QueueBooking.Status != "Cancelled" && p.QueueBooking.Status != "Expired")
                    .Select(p => p.SeatNumber!.Value)
                    .ToListAsync();

                foreach (var allocation in dto.Allocations)
                {
                    if (vehicleCapacity > 0 && allocation.SeatNumber > vehicleCapacity)
                        return BadRequest(new { message = $"Seat {allocation.SeatNumber} exceeds vehicle capacity of {vehicleCapacity}" });

                    if (otherPassengerSeats.Contains(allocation.SeatNumber))
                        return BadRequest(new { message = $"Seat {allocation.SeatNumber} is already allocated to another booking" });

                    var passenger = booking.Passengers.FirstOrDefault(p => p.Id == allocation.PassengerId);
                    if (passenger != null)
                    {
                        passenger.SeatNumber = allocation.SeatNumber;
                    }
                }

                booking.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                await _context.SaveChangesAsync();

                // Notify rider via SignalR
                await _hubContext.Clients.Group($"rank_{booking.TaxiRankId}")
                    .SendAsync("SeatsAllocated", new
                    {
                        bookingId = booking.Id,
                        queueEntryId = booking.QueueEntryId,
                        allocations = dto.Allocations,
                    });

                _logger.LogInformation("[QueueBooking] Seats allocated for booking {BookingId}: {Allocations}",
                    id, string.Join(", ", dto.Allocations.Select(a => $"P:{a.PassengerId}->S:{a.SeatNumber}")));

                return Ok(new
                {
                    message = "Seats allocated successfully",
                    booking.Id,
                    passengers = booking.Passengers.Select(p => new
                    {
                        p.Id,
                        p.Name,
                        p.SeatNumber,
                        p.Destination,
                    }).ToList(),
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[QueueBooking] Error allocating seats for booking {BookingId}", id);
                return StatusCode(500, new { message = "Failed to allocate seats" });
            }
        }

        // GET: api/QueueBooking/rank/{rankId}/bookings — Get all bookings for a rank (Admin/Marshal overview)
        [HttpGet("rank/{rankId}/bookings")]
        public async Task<ActionResult> GetRankBookings(Guid rankId, [FromQuery] string? date, [FromQuery] string? status)
        {
            try
            {
                var today = string.IsNullOrWhiteSpace(date)
                    ? DateTime.UtcNow.Date
                    : DateTime.Parse(date).Date;
                today = DateTime.SpecifyKind(today, DateTimeKind.Utc);

                var query = _context.QueueBookings
                    .Include(b => b.Passengers)
                    .Include(b => b.Vehicle)
                    .Include(b => b.Route)
                        .ThenInclude(r => r.Stops)
                    .Include(b => b.User)
                    .Include(b => b.QueueEntry)
                        .ThenInclude(q => q.Route)
                            .ThenInclude(r => r!.Stops)
                    .Where(b => b.TaxiRankId == rankId && b.QueueEntry != null && b.QueueEntry.QueueDate == today);

                if (!string.IsNullOrWhiteSpace(status))
                    query = query.Where(b => b.Status == status);

                var bookingEntities = await query
                    .OrderByDescending(b => b.CreatedAt)
                    .ToListAsync();

                // Auto-confirm bookings whose queue entries have been dispatched
                var pendingOnDispatched = bookingEntities
                    .Where(b => (b.Status == "Pending" || b.PaymentStatus == "Pending") && b.QueueEntry?.Status == "Dispatched")
                    .ToList();
                if (pendingOnDispatched.Any())
                {
                    var now = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
                    foreach (var bk in pendingOnDispatched)
                    {
                        if (bk.Status == "Pending")
                        {
                            bk.Status = "Confirmed";
                            bk.ConfirmedAt ??= now;
                        }
                        if (bk.PaymentStatus == "Pending")
                        {
                            bk.PaymentStatus = "Paid";
                            bk.PaidAt ??= now;
                        }
                        bk.UpdatedAt = now;
                    }
                    await _context.SaveChangesAsync();
                }

                // Build a lookup of vehicle → route from RouteVehicles for bookings with no route
                var noRouteVehicleIds = bookingEntities
                    .Where(b => b.Route == null && b.QueueEntry?.Route == null)
                    .Select(b => b.VehicleId)
                    .Where(v => v != Guid.Empty)
                    .Distinct()
                    .ToList();

                var vehicleRouteLookup = new Dictionary<Guid, MzansiFleet.Domain.Entities.Route>();
                if (noRouteVehicleIds.Any())
                {
                    vehicleRouteLookup = await _context.RouteVehicles
                        .Include(rv => rv.Route)
                            .ThenInclude(r => r.Stops)
                        .Where(rv => noRouteVehicleIds.Contains(rv.VehicleId) && rv.IsActive)
                        .GroupBy(rv => rv.VehicleId)
                        .Select(g => g.First())
                        .ToDictionaryAsync(rv => rv.VehicleId, rv => rv.Route!);
                }

                var bookings = bookingEntities.Select(b =>
                {
                    var route = b.Route ?? b.QueueEntry?.Route
                        ?? (vehicleRouteLookup.ContainsKey(b.VehicleId) ? vehicleRouteLookup[b.VehicleId] : null);
                    var routeStops = route?.Stops?.OrderBy(s => s.StopOrder).ToList();

                    var passengers = b.Passengers.Select(p =>
                    {
                        var fare = p.Fare;
                        if (fare == 0 && routeStops != null && !string.IsNullOrEmpty(p.Destination))
                        {
                            var stop = routeStops.FirstOrDefault(s =>
                                string.Equals(s.StopName, p.Destination, StringComparison.OrdinalIgnoreCase));
                            if (stop != null) fare = stop.FareFromOrigin;
                        }
                        if (fare == 0 && route != null) fare = route.StandardFare;
                        return new
                        {
                            p.Id,
                            p.Name,
                            p.ContactNumber,
                            p.Destination,
                            Fare = fare,
                            p.SeatNumber,
                            p.NextOfKinName,
                            p.NextOfKinContact,
                        };
                    }).ToList();

                    var totalFare = b.TotalFare > 0 ? b.TotalFare : passengers.Sum(p => p.Fare);

                    return new
                    {
                        b.Id,
                        b.QueueEntryId,
                        riderName = b.User?.FullName,
                        riderPhone = b.User?.Phone,
                        b.SeatsBooked,
                        totalFare,
                        b.PaymentMethod,
                        b.PaymentStatus,
                        b.PaymentReference,
                        b.Status,
                        b.CreatedAt,
                        b.ConfirmedAt,
                        vehicleRegistration = b.Vehicle?.Registration ?? b.QueueEntry?.Vehicle?.Registration,
                        routeName = route?.RouteName,
                        departureStation = route?.DepartureStation,
                        destinationStation = route?.DestinationStation,
                        passengers,
                    };
                }).ToList();

                return Ok(bookings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[QueueBooking] Error fetching rank bookings for {RankId}", rankId);
                return StatusCode(500, new { message = "Failed to load rank bookings" });
            }
        }

        // --- Helper: Notify rank admins and marshals of new booking ---
        private async Task NotifyRankStaffOfBooking(QueueBooking booking, DailyTaxiQueue queueEntry, CreateQueueBookingDto dto)
        {
            try
            {
                var rankId = queueEntry.TaxiRankId;
                var vehicleReg = queueEntry.Vehicle?.Registration ?? "Unknown";
                var routeName = queueEntry.Route?.RouteName ?? "Unknown Route";
                var passengerNames = dto.Passengers?.Count > 0
                    ? string.Join(", ", dto.Passengers.Select(p => p.Name))
                    : "Not specified";

                var subject = $"New Booking: {dto.SeatsBooked} seat(s) on {vehicleReg}";
                var content = $"A rider has booked {dto.SeatsBooked} seat(s) on vehicle {vehicleReg} ({routeName}).\n\n" +
                    $"Total Fare: R{booking.TotalFare:F2}\n" +
                    $"Payment Method: {booking.PaymentMethod}\n" +
                    $"Payment Ref: {booking.PaymentReference}\n" +
                    $"Passengers: {passengerNames}\n\n" +
                    $"Please allocate seats for this booking.";

                // Find all active admins for this rank
                var adminUserIds = await _context.TaxiRankAdmins
                    .Where(a => a.TaxiRankId == rankId && a.Status == "Active")
                    .Select(a => a.UserId)
                    .ToListAsync();

                // Find all active marshals for this rank
                var marshalUserIds = await _context.TaxiMarshalProfiles
                    .Where(m => m.TaxiRankId == rankId && m.Status == "Active")
                    .Select(m => m.UserId)
                    .ToListAsync();

                var allRecipients = adminUserIds.Concat(marshalUserIds).Distinct().ToList();

                foreach (var recipientId in allRecipients)
                {
                    var isAdmin = adminUserIds.Contains(recipientId);
                    _context.Messages.Add(new Message
                    {
                        Id = Guid.NewGuid(),
                        SenderType = "System",
                        SenderName = "Booking System",
                        RecipientType = isAdmin ? "Admin" : "Marshal",
                        RecipientId = recipientId,
                        RecipientMarshalId = !isAdmin ? recipientId : null,
                        TaxiRankId = rankId,
                        Subject = subject,
                        Content = content,
                        MessageType = "Alert",
                        IsRead = false,
                        CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc),
                        RelatedEntityType = "QueueBooking",
                        RelatedEntityId = booking.Id,
                    });
                }

                if (allRecipients.Count > 0)
                    await _context.SaveChangesAsync();

                _logger.LogInformation("[QueueBooking] Notified {Count} rank staff of booking {BookingId}", allRecipients.Count, booking.Id);
            }
            catch (Exception ex)
            {
                // Don't fail the booking if notification fails
                _logger.LogWarning(ex, "[QueueBooking] Failed to notify rank staff of booking {BookingId}", booking.Id);
            }
        }
    }

    // DTOs
    public class CreateQueueBookingDto
    {
        public Guid UserId { get; set; }
        public Guid QueueEntryId { get; set; }
        public int SeatsBooked { get; set; } = 1;
        public decimal TotalFare { get; set; }
        public string? PaymentMethod { get; set; } = "EFT";
        public string? Notes { get; set; }
        public List<QueueBookingPassengerDto>? Passengers { get; set; }
    }

    public class QueueBookingPassengerDto
    {
        public string? Name { get; set; }
        public string? ContactNumber { get; set; }
        public string? Email { get; set; }
        public string? Destination { get; set; }
        public decimal Fare { get; set; }
        public string? NextOfKinName { get; set; }
        public string? NextOfKinContact { get; set; }
    }

    public class UpdateQueueBookingDto
    {
        public List<QueueBookingPassengerDto>? Passengers { get; set; }
        public string? Notes { get; set; }
    }

    public class ConfirmPaymentDto
    {
        public string? BankReference { get; set; }
    }

    public class CancelQueueBookingDto
    {
        public string? Reason { get; set; }
    }

    public class AllocateSeatsDto
    {
        public List<SeatAllocationItem> Allocations { get; set; } = new();
    }

    public class SeatAllocationItem
    {
        public Guid PassengerId { get; set; }
        public int SeatNumber { get; set; }
    }
}
