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
        private readonly ITripScheduleRepository _scheduleRepository;
        private readonly MzansiFleetDbContext _context;

        public ScheduledTripBookingsController(
            IScheduledTripBookingRepository bookingRepository,
            ITripScheduleRepository scheduleRepository,
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
                IEnumerable<TripSchedule> schedules;
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
                var schedule = await _scheduleRepository.GetByIdAsync(dto.TripScheduleId);
                if (schedule == null)
                    return NotFound(new { message = "Schedule not found" });

                // Check if travel date is valid (not in the past, matches day of week)
                if (dto.TravelDate.Date < DateTime.UtcNow.Date)
                    return BadRequest(new { message = "Travel date cannot be in the past" });

                var dayName = dto.TravelDate.DayOfWeek.ToString().Substring(0, 3);
                if (!string.IsNullOrEmpty(schedule.DaysOfWeek) && !schedule.DaysOfWeek.Contains(dayName))
                    return BadRequest(new { message = $"This route does not operate on {dto.TravelDate.DayOfWeek}" });

                // Check seat availability if MaxPassengers is set
                if (schedule.MaxPassengers.HasValue)
                {
                    var existingBookings = await _bookingRepository.GetByScheduleAndDateAsync(dto.TripScheduleId, dto.TravelDate);
                    var bookedSeats = existingBookings.Sum(b => b.SeatsBooked);
                    if (bookedSeats + dto.SeatsBooked > schedule.MaxPassengers.Value)
                        return BadRequest(new { message = $"Only {schedule.MaxPassengers.Value - bookedSeats} seat(s) available" });
                }

                var booking = new ScheduledTripBooking
                {
                    Id = Guid.NewGuid(),
                    UserId = dto.UserId,
                    TripScheduleId = dto.TripScheduleId,
                    TaxiRankId = schedule.TaxiRankId,
                    TravelDate = dto.TravelDate,
                    SeatsBooked = dto.SeatsBooked > 0 ? dto.SeatsBooked : 1,
                    TotalFare = schedule.StandardFare * (dto.SeatsBooked > 0 ? dto.SeatsBooked : 1),
                    PassengerName = dto.PassengerName ?? "",
                    PassengerPhone = dto.PassengerPhone ?? "",
                    Status = "Confirmed",
                    ConfirmedAt = DateTime.UtcNow,
                    Notes = dto.Notes
                };

                await _bookingRepository.AddAsync(booking);

                return Ok(booking);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
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
        public Guid TripScheduleId { get; set; }
        public DateTime TravelDate { get; set; }
        public int SeatsBooked { get; set; } = 1;
        public string PassengerName { get; set; } = string.Empty;
        public string PassengerPhone { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }

    public class CancelBookingDto
    {
        public string? Reason { get; set; }
    }
}
