using System;

namespace MzansiFleet.Domain.DTOs
{
    // DTO for creating a new roadside assistance request
    public class CreateRoadsideAssistanceRequestDto
    {
        public Guid? VehicleId { get; set; }
        public string AssistanceType { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string? Latitude { get; set; }
        public string? Longitude { get; set; }
        public string IssueDescription { get; set; } = string.Empty;
        public string? AdditionalNotes { get; set; }
        public string Priority { get; set; } = "Normal";
    }
    
    // DTO for returning roadside assistance request details
    public class RoadsideAssistanceRequestDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string UserPhone { get; set; } = string.Empty;
        public string UserRole { get; set; } = string.Empty;
        
        public Guid? VehicleId { get; set; }
        public string? VehicleRegistration { get; set; }
        public string? VehicleMake { get; set; }
        public string? VehicleModel { get; set; }
        
        public Guid? DriverId { get; set; }
        public string? DriverName { get; set; }
        public string? DriverPhone { get; set; }
        
        public string AssistanceType { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string? Latitude { get; set; }
        public string? Longitude { get; set; }
        public string IssueDescription { get; set; } = string.Empty;
        public string? AdditionalNotes { get; set; }
        
        public string Status { get; set; } = string.Empty;
        public DateTime RequestedAt { get; set; }
        public DateTime? AssignedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        
        public Guid? ServiceProviderId { get; set; }
        public string? ServiceProviderName { get; set; }
        public string? ServiceProviderPhone { get; set; }
        public double? ServiceProviderRating { get; set; }
        public int? ServiceProviderReviews { get; set; }
        public string? TechnicianName { get; set; }
        public string? EstimatedArrivalTime { get; set; }
        
        public decimal? EstimatedCost { get; set; }
        public decimal? ActualCost { get; set; }
        public string Priority { get; set; } = string.Empty;
    }
    
    // DTO for assigning a service provider to a request
    public class AssignRoadsideAssistanceDto
    {
        public Guid RequestId { get; set; }
        public string? TechnicianName { get; set; }
        public string? EstimatedArrivalTime { get; set; }
        public decimal? EstimatedCost { get; set; }
    }
    
    // DTO for updating request status
    public class UpdateRoadsideAssistanceStatusDto
    {
        public Guid RequestId { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal? ActualCost { get; set; }
        public string? Notes { get; set; }
    }
}
