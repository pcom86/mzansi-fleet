using System;

namespace MzansiFleet.Domain.Entities
{
    public class RoadsideAssistanceRequest
    {
        public Guid Id { get; set; }
        
        // Requester Information
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string UserPhone { get; set; } = string.Empty;
        public string UserRole { get; set; } = string.Empty; // "Owner" or "Driver"
        
        // Vehicle Information
        public Guid? VehicleId { get; set; }
        public string? VehicleRegistration { get; set; }
        public string? VehicleMake { get; set; }
        public string? VehicleModel { get; set; }
        
        // Assistance Request Details
        public string AssistanceType { get; set; } = string.Empty; // Towing, Tire Change, Fuel Delivery, Jump Start, Lockout, etc.
        public string Location { get; set; } = string.Empty;
        public string? Latitude { get; set; }
        public string? Longitude { get; set; }
        public string IssueDescription { get; set; } = string.Empty;
        public string? AdditionalNotes { get; set; }
        
        // Status
        public string Status { get; set; } = "Pending"; // Pending, Assigned, InProgress, Completed, Cancelled
        public DateTime RequestedAt { get; set; }
        public DateTime? AssignedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        
        // Service Provider Assignment
        public Guid? ServiceProviderId { get; set; }
        public string? ServiceProviderName { get; set; }
        public string? ServiceProviderPhone { get; set; }
        public string? TechnicianName { get; set; }
        public string? EstimatedArrivalTime { get; set; }
        
        // Cost
        public decimal? EstimatedCost { get; set; }
        public decimal? ActualCost { get; set; }
        
        // Urgency
        public string Priority { get; set; } = "Normal"; // Normal, High, Emergency
        
        // Navigation Properties
        public virtual Vehicle? Vehicle { get; set; }
        public virtual ServiceProviderProfile? ServiceProvider { get; set; }
    }
}
