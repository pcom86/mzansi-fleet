using System;

namespace MzansiFleet.Domain.DTOs
{
    public class TripRequestDto
    {
        public Guid Id { get; set; }
        public Guid PassengerId { get; set; }
        public Guid TenantId { get; set; }
        public string PickupLocation { get; set; }
        public string DropoffLocation { get; set; }
        public DateTime RequestedTime { get; set; }
        public int PassengerCount { get; set; }
        public string Notes { get; set; }
        public bool IsPooling { get; set; }
        public string State { get; set; }
    }
    public class TripOfferDto
    {
        public Guid Id { get; set; }
        public Guid TripRequestId { get; set; }
        public Guid DriverId { get; set; }
        public decimal OfferPrice { get; set; }
        public DateTime Expiry { get; set; }
        public string State { get; set; }
    }
    public class TripBookingDto
    {
        public Guid Id { get; set; }
        public Guid TripRequestId { get; set; }
        public Guid TripOfferId { get; set; }
        public Guid VehicleId { get; set; }
        public Guid DriverId { get; set; }
        public Guid PassengerId { get; set; }
        public string State { get; set; }
        public DateTime? ConfirmedAt { get; set; }
    }
    public class TripStopDto
    {
        public Guid Id { get; set; }
        public Guid TripBookingId { get; set; }
        public string Location { get; set; }
        public int StopOrder { get; set; }
        public string Notes { get; set; }
    }
    public class PoolingGroupDto
    {
        public Guid Id { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}

