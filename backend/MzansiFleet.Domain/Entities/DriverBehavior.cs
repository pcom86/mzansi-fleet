using System;
using System.Collections.Generic;

namespace MzansiFleet.Domain.Entities
{
    /// <summary>
    /// Records a single driver behavior event (positive or negative).
    /// </summary>
    public class DriverBehaviorEvent
    {
        public Guid Id { get; set; }
        public Guid DriverId { get; set; }          // FK → DriverProfiles.Id
        public Guid? VehicleId { get; set; }         // FK → Vehicles.Id (optional)
        public Guid? ReportedById { get; set; }      // User who reported the event
        public Guid? TenantId { get; set; }           // Owner's tenant

        // Event details
        public string Category { get; set; } = string.Empty;   // Speeding, HarshBraking, Accident, Compliment, OnTime, etc.
        public string Severity { get; set; } = "Medium";       // Low, Medium, High, Critical
        public string Description { get; set; } = string.Empty;
        public string? Location { get; set; }
        public int PointsImpact { get; set; }                  // Negative = deduction, Positive = bonus
        public string EventType { get; set; } = "Negative";    // Positive, Negative, Neutral

        // Metadata
        public DateTime EventDate { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? Notes { get; set; }
        public string? EvidenceUrl { get; set; }               // Photo / document link
        public bool IsResolved { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public string? Resolution { get; set; }

        // Navigation
        public DriverProfile? Driver { get; set; }
        public Vehicle? Vehicle { get; set; }
    }
}
