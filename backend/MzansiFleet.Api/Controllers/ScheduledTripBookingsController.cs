#nullable enable
using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Repository;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScheduledTripBookingsController : ControllerBase
    {
        private readonly IScheduledTripBookingRepository _bookingRepository;
        private readonly IRouteRepository _scheduleRepository;
        private readonly MzansiFleetDbContext _context;

        public ScheduledTripBookingsController(
            IScheduledTripBookingRepository bookingRepository,
            IRouteRepository scheduleRepository,
            MzansiFleetDbContext context)
        {
            _bookingRepository = bookingRepository;
            _scheduleRepository = scheduleRepository;
            _context = context;
        }

        // GET: api/ScheduledTripBookings/schedules?taxiRankId={id}
        // Public: Browse all active schedules for a rank (for users to see available trips)
        [HttpGet("schedules")]
        public async Task<ActionResult> GetAvailableSchedules([FromQuery] Guid? taxiRankId)
        {
            try
            {
                IEnumerable<Route> schedules;
                if (taxiRankId.HasValue)
                {
                    schedules = await _scheduleRepository.GetActiveByTaxiRankIdAsync(taxiRankId.Value);
                }
                else
                {
                    // Return all active schedules across all ranks
                    schedules = (await _scheduleRepository.GetAllAsync()).Where(s => s.IsActive);
                }

                // Include rank info
                var result = new List<object>();
                foreach (var s in schedules)
                {
                    var rank = await _context.TaxiRanks.FindAsync(s.TaxiRankId);
                    result.Add(new
                    {
                        s.Id,
                        s.TaxiRankId,
                        TaxiRankName = rank?.Name ?? "",
                        TaxiRankCity = rank?.City ?? "",
                        s.RouteName,
                        s.DepartureStation,
                        s.DestinationStation,
                        DepartureTime = s.DepartureTime.ToString(@"hh\:mm"),
                        s.FrequencyMinutes,
                        s.DaysOfWeek,
                        s.StandardFare,
                        s.ExpectedDurationMinutes,
                        s.MaxPassengers,
                        s.IsActive,
                        s.Notes
                    });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/ScheduledTripBookings
        // Book a seat on a scheduled trip
        [HttpPost]
        public async Task<ActionResult<ScheduledTripBooking>> CreateBooking([FromBody] CreateBookingDto dto)
        {
            try
            {
                var schedule = await _scheduleRepository.GetByIdAsync(dto.RouteId);
                if (schedule == null)
                    return NotFound(new { message = "Schedule not found" });

                // Check if travel date is valid (not in the past, matches day of week)
                if (dto.TravelDate.Date < DateTime.UtcNow.Date)
                    return BadRequest(new { message = "Travel date cannot be in the past" });

                if (!string.IsNullOrEmpty(schedule.DaysOfWeek))
                {
                    var dayName = dto.TravelDate.DayOfWeek.ToString().Substring(0, 3); // e.g. "Fri"
                    var dayNumber = ((int)dto.TravelDate.DayOfWeek).ToString(); // e.g. "5"
                    var days = schedule.DaysOfWeek.Split(',').Select(d => d.Trim()).ToList();
                    var isAllowed = days.Any(d => d.Equals(dayName, StringComparison.OrdinalIgnoreCase) || d == dayNumber);
                    if (!isAllowed)
                        return BadRequest(new { message = $"This route does not operate on {dto.TravelDate.DayOfWeek}" });
                }

                // Validate passenger count matches passengers provided
                if (dto.Passengers.Count != dto.SeatsBooked)
                    return BadRequest(new { message = "Number of passengers must match seats booked" });

                // Check seat availability including specific seat numbers
                if (schedule.MaxPassengers.HasValue)
                {
                    var existingBookings = await _bookingRepository.GetByRouteAndDateAsync(dto.RouteId, dto.TravelDate);
                    var bookedSeats = existingBookings.Sum(b => b.SeatsBooked);
                    
                    // Check if requested seats are available
                    if (bookedSeats + dto.SeatsBooked > schedule.MaxPassengers.Value)
                        return BadRequest(new { message = $"Only {schedule.MaxPassengers.Value - bookedSeats} seat(s) available" });
                    
                    // Check if specific seat numbers are already booked
                    if (dto.SeatNumbers?.Count > 0)
                    {
                        var allBookedSeatNumbers = existingBookings.SelectMany(b => b.SeatNumbers ?? new List<int>()).ToList();
                        var conflictingSeats = dto.SeatNumbers.Where(s => allBookedSeatNumbers.Contains(s)).ToList();
                        if (conflictingSeats.Any())
                            return BadRequest(new { message = $"Seat(s) {string.Join(", ", conflictingSeats)} are already booked" });
                    }
                }

                var booking = new ScheduledTripBooking
                {
                    Id = Guid.NewGuid(),
                    UserId = dto.UserId,
                    RouteId = dto.RouteId,
                    TaxiRankId = schedule.TaxiRankId,
                    ScheduledTripId = dto.ScheduledTripId,
                    TravelDate = dto.TravelDate,
                    SeatsBooked = dto.SeatsBooked,
                    SeatNumbers = dto.SeatNumbers ?? new List<int>(),
                    TotalFare = dto.TotalFare,
                    PaymentMethod = dto.PaymentMethod,
                    PaymentStatus = "Pending",
                    Status = "Confirmed",
                    ConfirmedAt = DateTime.UtcNow,
                    Notes = dto.Notes
                };

                // Add passengers
                foreach (var passengerDto in dto.Passengers)
                {
                    var passenger = new BookingPassenger
                    {
                        Id = Guid.NewGuid(),
                        BookingId = booking.Id,
                        Name = passengerDto.Name,
                        ContactNumber = passengerDto.ContactNumber,
                        Email = passengerDto.Email,
                        IdNumber = passengerDto.IdNumber,
                        Address = passengerDto.Address,
                        Destination = passengerDto.Destination
                    };
                    booking.Passengers.Add(passenger);
                }

                await _bookingRepository.AddAsync(booking);

                // Send notifications to marshal and manager
                await SendBookingNotifications(booking, schedule);

                return Ok(booking);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private async Task SendBookingNotifications(ScheduledTripBooking booking, Route schedule)
        {
            try
            {
                // Get taxi rank marshals and admins
                var marshals = await _context.TaxiMarshalProfiles
                    .Where(m => m.TaxiRankId == schedule.TaxiRankId)
                    .ToListAsync();

                var admins = await _context.TaxiRankAdmins
                    .Where(a => a.TaxiRankId == schedule.TaxiRankId)
                    .ToListAsync();

                var subject = $"New Booking: {schedule.RouteName}";
                var body = $@"A new booking has been made for your scheduled trip:

Route: {schedule.RouteName}
From: {schedule.DepartureStation} → To: {schedule.DestinationStation}
Date: {booking.TravelDate:yyyy-MM-dd}
Seats: {booking.SeatsBooked}
Total: R{booking.TotalFare:N2}
Payment: {booking.PaymentMethod}

Passengers:
{string.Join("\n", booking.Passengers.Select(p => $"- {p.Name} ({p.ContactNumber})"))}";

                // Send to marshals
                foreach (var marshal in marshals)
                {
                    await _context.Messages.AddAsync(new Message
                    {
                        Id = Guid.NewGuid(),
                        SenderType = "System",
                        SenderId = Guid.Empty,
                        SenderName = "System",
                        RecipientType = "Marshal",
                        RecipientId = marshal.UserId,
                        Subject = subject,
                        Content = body,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                // Send to admins
                foreach (var admin in admins)
                {
                    await _context.Messages.AddAsync(new Message
                    {
                        Id = Guid.NewGuid(),
                        SenderType = "System",
                        SenderId = Guid.Empty,
                        SenderName = "System",
                        RecipientType = "Admin",
                        RecipientId = admin.UserId,
                        Subject = subject,
                        Content = body,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                // Send confirmation to the passenger (booking user)
                var passengerSubject = $"Booking Confirmed: {schedule.RouteName}";
                var passengerBody = $@"Your booking has been confirmed!

Route: {schedule.RouteName}
From: {schedule.DepartureStation} → To: {schedule.DestinationStation}
Date: {booking.TravelDate:yyyy-MM-dd}
Seats: {booking.SeatsBooked}
Seat Numbers: {string.Join(", ", booking.SeatNumbers ?? new List<int>())}
Total Fare: R{booking.TotalFare:N2}
Payment Method: {booking.PaymentMethod}
Status: {booking.Status}
Booking Reference: {booking.Id.ToString().Substring(0, 8).ToUpper()}

Passengers:
{string.Join("\n", booking.Passengers.Select(p => $"- {p.Name} → {p.Destination}"))}

Thank you for booking with MzansiFleet!";

                await _context.Messages.AddAsync(new Message
                {
                    Id = Guid.NewGuid(),
                    SenderType = "System",
                    SenderId = Guid.Empty,
                    SenderName = "MzansiFleet Bookings",
                    RecipientType = "Customer",
                    RecipientId = booking.UserId,
                    Subject = passengerSubject,
                    Content = passengerBody,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });

                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Log error but don't fail the booking
                Console.WriteLine($"Failed to send booking notifications: {ex.Message}");
            }
        }

        // GET: api/ScheduledTripBookings/user/{userId}
        // Get all bookings for a user
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<ScheduledTripBooking>>> GetUserBookings(Guid userId)
        {
            var bookings = await _bookingRepository.GetByUserIdAsync(userId);
            return Ok(bookings);
        }

        // GET: api/ScheduledTripBookings/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<ScheduledTripBooking>> GetById(Guid id)
        {
            var booking = await _bookingRepository.GetByIdAsync(id);
            if (booking == null)
                return NotFound(new { message = "Booking not found" });
            return Ok(booking);
        }

        // PUT: api/ScheduledTripBookings/{id}
        // Update a booking: edit existing passengers, add new passengers, update seats
        [HttpPut("{id}")]
        public async Task<ActionResult> UpdateBooking(Guid id, [FromBody] UpdateBookingDto dto)
        {
            try
            {
                var booking = await _bookingRepository.GetByIdAsync(id);
                if (booking == null)
                    return NotFound(new { message = "Booking not found" });

                if (booking.Status == "Cancelled")
                    return BadRequest(new { message = "Cannot edit a cancelled booking" });

                if (booking.Status == "Completed")
                    return BadRequest(new { message = "Cannot edit a completed booking" });

                // Get route for seat validation
                var schedule = await _context.Routes.FirstOrDefaultAsync(r => r.Id == booking.RouteId);

                // Update existing passengers
                if (dto.UpdatedPassengers != null)
                {
                    foreach (var up in dto.UpdatedPassengers)
                    {
                        var existing = booking.Passengers.FirstOrDefault(p => p.Id == up.Id);
                        if (existing != null)
                        {
                            existing.Name = up.Name;
                            existing.ContactNumber = up.ContactNumber;
                            existing.Email = up.Email;
                            existing.Destination = up.Destination;
                        }
                    }
                }

                // Add new passengers
                if (dto.NewPassengers != null && dto.NewPassengers.Count > 0)
                {
                    // Validate seat availability
                    var totalAfter = booking.SeatsBooked + dto.NewPassengers.Count;
                    if (schedule?.MaxPassengers.HasValue == true)
                    {
                        var existingBookings = await _bookingRepository.GetByRouteAndDateAsync(booking.RouteId, booking.TravelDate);
                        var otherBookedSeats = existingBookings.Where(b => b.Id != booking.Id).Sum(b => b.SeatsBooked);
                        if (otherBookedSeats + totalAfter > schedule.MaxPassengers.Value)
                            return BadRequest(new { message = $"Only {schedule.MaxPassengers.Value - otherBookedSeats - booking.SeatsBooked} additional seat(s) available" });
                    }

                    // Add new seat numbers
                    var newSeatNumbers = dto.NewSeatNumbers ?? new List<int>();
                    if (newSeatNumbers.Count > 0)
                    {
                        // Validate new seats aren't already taken
                        var existingBookings = await _bookingRepository.GetByRouteAndDateAsync(booking.RouteId, booking.TravelDate);
                        var allBookedSeatNumbers = existingBookings
                            .Where(b => b.Id != booking.Id)
                            .SelectMany(b => b.SeatNumbers ?? new List<int>())
                            .ToList();
                        allBookedSeatNumbers.AddRange(booking.SeatNumbers ?? new List<int>());
                        var conflicting = newSeatNumbers.Where(s => allBookedSeatNumbers.Contains(s)).ToList();
                        if (conflicting.Any())
                            return BadRequest(new { message = $"Seat(s) {string.Join(", ", conflicting)} are already booked" });

                        booking.SeatNumbers = (booking.SeatNumbers ?? new List<int>()).Concat(newSeatNumbers).ToList();
                    }

                    foreach (var np in dto.NewPassengers)
                    {
                        booking.Passengers.Add(new BookingPassenger
                        {
                            Id = Guid.NewGuid(),
                            BookingId = booking.Id,
                            Name = np.Name,
                            ContactNumber = np.ContactNumber,
                            Email = np.Email,
                            Destination = np.Destination
                        });
                    }

                    booking.SeatsBooked = totalAfter;

                    // Recalculate fare if provided
                    if (dto.TotalFare.HasValue)
                        booking.TotalFare = dto.TotalFare.Value;
                }

                // Update payment method if provided
                if (!string.IsNullOrEmpty(dto.PaymentMethod))
                    booking.PaymentMethod = dto.PaymentMethod;

                booking.UpdatedAt = DateTime.UtcNow;
                await _bookingRepository.UpdateAsync(booking);

                // Re-fetch with includes
                var updated = await _bookingRepository.GetByIdAsync(id);
                return Ok(updated);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/ScheduledTripBookings/{id}/cancel
        [HttpPut("{id}/cancel")]
        public async Task<ActionResult> CancelBooking(Guid id, [FromBody] CancelBookingDto dto)
        {
            var booking = await _bookingRepository.GetByIdAsync(id);
            if (booking == null)
                return NotFound(new { message = "Booking not found" });

            if (booking.Status == "Cancelled")
                return BadRequest(new { message = "Booking is already cancelled" });

            booking.Status = "Cancelled";
            booking.CancellationReason = dto?.Reason;
            booking.CancelledAt = DateTime.UtcNow;

            await _bookingRepository.UpdateAsync(booking);
            return Ok(new { message = "Booking cancelled", booking });
        }

        // GET: api/ScheduledTripBookings/rank/{taxiRankId}
        // For admins: see all bookings for their rank
        [HttpGet("rank/{taxiRankId}")]
        public async Task<ActionResult<IEnumerable<ScheduledTripBooking>>> GetRankBookings(Guid taxiRankId)
        {
            var bookings = await _bookingRepository.GetByTaxiRankIdAsync(taxiRankId);
            return Ok(bookings);
        }
    }

    public class CreateBookingDto
    {
        public Guid UserId { get; set; }
        public Guid RouteId { get; set; }
        public Guid? ScheduledTripId { get; set; } // Optional: specific trip instance
        public DateTime TravelDate { get; set; }
        public int SeatsBooked { get; set; } = 1;
        public List<int> SeatNumbers { get; set; } = new(); // Specific seat numbers selected
        public decimal TotalFare { get; set; }
        public List<BookingPassengerDto> Passengers { get; set; } = new();
        public string PaymentMethod { get; set; } = string.Empty; // eft, card, cash, wallet
        public string? Notes { get; set; }
    }

    public class BookingPassengerDto
    {
        public string Name { get; set; } = string.Empty;
        public string ContactNumber { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? IdNumber { get; set; }
        public string? Address { get; set; }
        public string Destination { get; set; } = string.Empty;
    }

    public class UpdateBookingDto
    {
        public List<UpdatePassengerDto>? UpdatedPassengers { get; set; }
        public List<BookingPassengerDto>? NewPassengers { get; set; }
        public List<int>? NewSeatNumbers { get; set; }
        public decimal? TotalFare { get; set; }
        public string? PaymentMethod { get; set; }
    }

    public class UpdatePassengerDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string ContactNumber { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string Destination { get; set; } = string.Empty;
    }

    public class CancelBookingDto
    {
        public string? Reason { get; set; }
    }
}

