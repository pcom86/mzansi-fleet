using System;

namespace MzansiFleet.Domain.Entities
{
    public class MaintenanceHistory
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public DateTime MaintenanceDate { get; set; }
        public string MaintenanceType { get; set; } // Repair, Replacement, Inspection, etc.
        public string Component { get; set; } // Engine, Brakes, Tires, etc.
        public string Description { get; set; }
        public int MileageAtMaintenance { get; set; }
        public decimal Cost { get; set; }
        public string ServiceProvider { get; set; }
        public string Priority { get; set; } // Low, Medium, High, Critical
        public string Status { get; set; } // Completed, In Progress, Scheduled
        public DateTime? ScheduledDate { get; set; }
        public DateTime? CompletedDate { get; set; }
        public string? Notes { get; set; }
        public string? InvoiceNumber { get; set; }
        public string? PerformedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? ServiceProviderRating { get; set; } // 1-5 stars rating
    }
}
