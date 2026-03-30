using System;

namespace MzansiFleet.Domain.Entities
{
    /// <summary>
    /// An incident reported by a passenger for a taxi rank to attend to.
    /// </summary>
    public class Incident
    {
        public Guid Id { get; set; }
        public Guid? TaxiRankId { get; set; }
        public Guid? TaxiRankTripId { get; set; }
        public Guid? TripPassengerId { get; set; }
        public Guid? ReportedByUserId { get; set; }
        public Guid? TenantId { get; set; }

        // Reporter details (in case user is not registered)
        public string ReporterName { get; set; } = string.Empty;
        public string? ReporterPhone { get; set; }

        // Incident details
        public string Category { get; set; } = string.Empty; // Safety, Vehicle, Driver, Route, Overcharging, Harassment, Other
        public string Severity { get; set; } = "Medium"; // Low, Medium, High, Critical
        public string Description { get; set; } = string.Empty;
        public string? Location { get; set; }

        // Status tracking
        public string Status { get; set; } = "Open"; // Open, InProgress, Resolved, Dismissed
        public string? Resolution { get; set; }
        public Guid? ResolvedByUserId { get; set; }
        public DateTime? ResolvedAt { get; set; }

        // Metadata
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation
        public TaxiRank? TaxiRank { get; set; }
        public TaxiRankTrip? TaxiRankTrip { get; set; }
    }
}
