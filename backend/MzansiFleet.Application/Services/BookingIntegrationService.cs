using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MzansiFleet.Application.Services
{
    public interface IBookingIntegrationService
    {
        Task<List<Passenger>> GetPassengersFromBookingsAsync(Guid tripScheduleId, DateTime travelDate);
        Task<List<Passenger>> ConvertBookingPassengersToTripPassengersAsync(List<ScheduledTripBooking> bookings);
        Task MarkBookingsAsCompletedAsync(List<Guid> bookingIds);
    }

    public class BookingIntegrationService : IBookingIntegrationService
    {
        private readonly MzansiFleetDbContext _context;

        public BookingIntegrationService(MzansiFleetDbContext context)
        {
            _context = context;
        }

        public async Task<List<Passenger>> GetPassengersFromBookingsAsync(Guid tripScheduleId, DateTime travelDate)
        {
            var bookings = await _context.ScheduledTripBookings
                .Include(b => b.Passengers)
                .Where(b => b.TripScheduleId == tripScheduleId && 
                           b.TravelDate.Date == travelDate.Date && 
                           b.Status == "Confirmed")
                .ToListAsync();

            return await ConvertBookingPassengersToTripPassengersAsync(bookings);
        }

        public async Task<List<Passenger>> ConvertBookingPassengersToTripPassengersAsync(List<ScheduledTripBooking> bookings)
        {
            var passengers = new List<Passenger>();

            foreach (var booking in bookings)
            {
                foreach (var bookingPassenger in booking.Passengers)
                {
                    var tripPassenger = new Passenger
                    {
                        Id = Guid.NewGuid(),
                        TripId = Guid.Empty, // Will be set when trip is created
                        Name = bookingPassenger.Name,
                        ContactNumber = bookingPassenger.ContactNumber,
                        NextOfKin = null, // Not available in booking
                        NextOfKinContact = null, // Not available in booking
                        Address = bookingPassenger.Address,
                        Destination = bookingPassenger.Destination,
                        FareAmount = booking.TotalFare / booking.SeatsBooked // Distribute fare evenly
                    };

                    passengers.Add(tripPassenger);
                }
            }

            return passengers;
        }

        public async Task MarkBookingsAsCompletedAsync(List<Guid> bookingIds)
        {
            var bookings = await _context.ScheduledTripBookings
                .Where(b => bookingIds.Contains(b.Id))
                .ToListAsync();

            foreach (var booking in bookings)
            {
                booking.Status = "Completed";
                booking.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
        }
    }
}
