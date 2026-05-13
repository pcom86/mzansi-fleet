using System;
using System.Collections.Generic;

namespace MzansiFleet.Domain.Entities
{
    public class TripRequest
    {
        public Guid Id { get; set; }
        public Guid PassengerId { get; set; }
        public Guid TenantId { get; set; }
        public Guid? TaxiRankId { get; set; }
        public Guid? RouteId { get; set; }
        public Guid? DriverId { get; set; }
        public string PickupLocation { get; set; }
        public string DropoffLocation { get; set; }
        public DateTime RequestedTime { get; set; }
        public DateTime? AcceptedAt { get; set; }
        public DateTime? PickupStartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public decimal DistanceKm { get; set; }
        public decimal RatePerKm { get; set; }
        public decimal TotalPrice { get; set; }
        public int PassengerCount { get; set; }
        public string Notes { get; set; }
        public bool IsPooling { get; set; }
        public string State { get; set; } // Requested, OffersReceived, Booked, InProgress, Completed
    }

    public class TripOffer
    {
        public Guid Id { get; set; }
        public Guid TripRequestId { get; set; }
        public Guid DriverId { get; set; }
        public decimal OfferPrice { get; set; }
        public DateTime Expiry { get; set; }
        public string State { get; set; } // Pending, Accepted, Expired
    }

    public class TripBooking
    {
        public Guid Id { get; set; }
        public Guid TripRequestId { get; set; }
        public Guid TripOfferId { get; set; }
        public Guid VehicleId { get; set; }
        public Guid DriverId { get; set; }
        public Guid PassengerId { get; set; }
        public string State { get; set; } // Booked, Confirmed, EnRoute, Arrived, PickedUp, Completed, Cancelled
        public DateTime? ConfirmedAt { get; set; }
    }

    public class TripStop
    {
        public Guid Id { get; set; }
        public Guid TripBookingId { get; set; }
        public string Location { get; set; }
        public int StopOrder { get; set; }
        public string Notes { get; set; }
    }

    public class PoolingGroup
    {
        public Guid Id { get; set; }
        public DateTime CreatedAt { get; set; }
        public ICollection<TripBooking> TripBookings { get; set; }
    }
}

