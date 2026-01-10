using System;

namespace MzansiFleet.Application.Commands
{
    public class CreateTripCommand
    {
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
    public class UpdateTripCommand
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
    public class DeleteTripCommand
    {
        public Guid Id { get; set; }
    }
}

