using System;
using System.Collections.Generic;

namespace MzansiFleet.Domain.Entities
{
    public class VehicleDocument
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public string DocumentType { get; set; } = string.Empty; // Disc, Insurance, Roadworthy, etc.
        public string FileUrl { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
        public Vehicle? Vehicle { get; set; }
    }

    public class MaintenanceEvent
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public DateTime Date { get; set; }
        public int Odometer { get; set; }
        public string Description { get; set; }
        public string Vendor { get; set; }
        public decimal Cost { get; set; }
        public string Attachments { get; set; } // Comma-separated URLs or JSON
        public Vehicle Vehicle { get; set; }
    }

    public class ServiceRule
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public string RuleType { get; set; } // Time-based, Km-based
        public int? IntervalDays { get; set; }
        public int? IntervalKm { get; set; }
        public Vehicle Vehicle { get; set; }
    }

    public class PartRule
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public string PartName { get; set; }
        public int? IntervalDays { get; set; }
        public int? IntervalKm { get; set; }
        public Vehicle Vehicle { get; set; }
    }
}

