using System;
using System.Collections.Generic;

namespace MzansiFleet.Domain.Entities
{
    public class Vehicle
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string Registration { get; set; }
        public string Make { get; set; }
        public string Model { get; set; }
        public int Year { get; set; }
        public string VIN { get; set; }
        public string EngineNumber { get; set; }
        public int Odometer { get; set; }
        public int Mileage { get; set; }
        public DateTime? LastServiceDate { get; set; }
        public DateTime? NextServiceDate { get; set; }
        public DateTime? LastMaintenanceDate { get; set; }
        public DateTime? NextMaintenanceDate { get; set; }
        public int ServiceIntervalKm { get; set; } = 10000; // Default service interval
        public int Capacity { get; set; }
        public string Type { get; set; }
        public string BaseLocation { get; set; }
        public string Status { get; set; }
        public string? PhotoBase64 { get; set; } = string.Empty;
        public List<string> Photos { get; set; } = new List<string>();
        // ...existing code...
    }
}

