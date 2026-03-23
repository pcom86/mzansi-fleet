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
    public class QueueBookingController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;
        private readonly ILogger<QueueBookingController> _logger;

        public QueueBookingController(MzansiFleetDbContext context, ILogger<QueueBookingController> logger)
        {
            _context = context;
            _logger = logger;
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
                    .Where(q => q.TaxiRankId == rankId
                        && q.QueueDate == today
                        && (q.Status == "Waiting" || q.Status == "Loading"))
                    .OrderBy(q => q.QueuePosition)
                    .ToListAsync();

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
                    return new
                    {
                        q.Id,
                        q.QueuePosition,
                        q.Status,
                        q.RouteId,
                        routeName = q.Route?.RouteName,
                        departureStation = q.Route?.DepartureStation,
                        destinationStation = q.Route?.DestinationStation,
                        standardFare = q.Route?.StandardFare ?? 0,
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
                    .Where(r => r.activeVehicles > 0)
                    .OrderByDescending(r => r.activeVehicles)
                    .ToListAsync();

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

                // Calculate fare
                var farePerSeat = queueEntry.Route?.StandardFare ?? 0;
                var totalFare = farePerSeat * dto.SeatsBooked;

                // Generate EFT payment reference
                var paymentRef = $"MF-Q{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";

                var booking = new QueueBooking
                {
                    Id = Guid.NewGuid(),
                    UserId = dto.UserId,
                    QueueEntryId = dto.QueueEntryId,
                    TaxiRankId = queueEntry.TaxiRankId,
                    RouteId = queueEntry.RouteId,
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
                if (dto.Passengers?.Count > 0)
                {
                    foreach (var p in dto.Passengers)
                    {
                        _context.QueueBookingPassengers.Add(new QueueBookingPassenger
                        {
                            Id = Guid.NewGuid(),
                            QueueBookingId = booking.Id,
                            Name = p.Name?.Trim() ?? "",
                            ContactNumber = p.ContactNumber?.Trim() ?? "",
                            Email = p.Email?.Trim(),
                            Destination = p.Destination?.Trim(),
                            CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc),
                        });
                    }
                }

                await _context.SaveChangesAsync();

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

        // GET: api/QueueBooking/user/{userId} — Get rider's queue bookings
        [HttpGet("user/{userId}")]
        public async Task<ActionResult> GetUserBookings(Guid userId)
        {
            try
            {
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
                        taxiRankName = b.TaxiRank != null ? b.TaxiRank.Name : null,
                        routeName = b.Route != null ? b.Route.RouteName : null,
                        departureStation = b.Route != null ? b.Route.DepartureStation : null,
                        destinationStation = b.Route != null ? b.Route.DestinationStation : null,
                        vehicleRegistration = b.Vehicle != null ? b.Vehicle.Registration : null,
                        vehicleMake = b.Vehicle != null ? b.Vehicle.Make : null,
                        vehicleModel = b.Vehicle != null ? b.Vehicle.Model : null,
                        queueDate = b.QueueEntry != null ? b.QueueEntry.QueueDate : (DateTime?)null,
                        queueStatus = b.QueueEntry != null ? b.QueueEntry.Status : null,
                        passengers = b.Passengers.Select(p => new
                        {
                            p.Id,
                            p.Name,
                            p.ContactNumber,
                            p.Email,
                            p.Destination,
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
    }

    // DTOs
    public class CreateQueueBookingDto
    {
        public Guid UserId { get; set; }
        public Guid QueueEntryId { get; set; }
        public int SeatsBooked { get; set; } = 1;
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
    }

    public class ConfirmPaymentDto
    {
        public string? BankReference { get; set; }
    }

    public class CancelQueueBookingDto
    {
        public string? Reason { get; set; }
    }
}
