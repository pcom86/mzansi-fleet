using System;

namespace MzansiFleet.Domain.Entities
{
    public class VehicleEarnings
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public string Source { get; set; } = string.Empty; // Trip, Rental, Delivery, etc.
        public string? Description { get; set; }
        public string Period { get; set; } = string.Empty; // Daily, Weekly, Monthly
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public Vehicle? Vehicle { get; set; }
    }

    public class VehicleExpense
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public string Category { get; set; } = string.Empty; // Fuel, Maintenance, Insurance, Repairs, etc.
        public string? Description { get; set; }
        public string? InvoiceNumber { get; set; }
        public string? Vendor { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public Vehicle? Vehicle { get; set; }
    }
}
