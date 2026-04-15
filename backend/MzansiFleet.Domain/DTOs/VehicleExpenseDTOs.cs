using System;
using System.Collections.Generic;

namespace MzansiFleet.Domain.DTOs
{
    public class CreateVehicleExpenseDto
    {
        public Guid VehicleId { get; set; }
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public string Category { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? InvoiceNumber { get; set; }
        public string? Vendor { get; set; }
        
        // Enhanced fields
        public string? ReceiptImageData { get; set; } // Base64 image data
        public string? ReceiptFileName { get; set; }
        public bool IsMechanical { get; set; } = false;
        public string? MechanicalCategory { get; set; }
        public List<MechanicalPartDto>? PartsReplaced { get; set; }
        public string? LaborDescription { get; set; }
        public decimal? LaborCost { get; set; }
        public decimal? PartsCost { get; set; }
        public string? MechanicName { get; set; }
        public string? WarrantyInfo { get; set; }
        public int? OdometerReading { get; set; }
        public DateTime? NextServiceDate { get; set; }
    }

    public class MechanicalPartDto
    {
        public string PartName { get; set; } = string.Empty;
        public string PartCategory { get; set; } = string.Empty; // Engine, Brake, Suspension, etc.
        public string? PartNumber { get; set; } // OEM part number
        public string? Brand { get; set; } // Brand of the part
        public decimal Cost { get; set; }
        public int Quantity { get; set; } = 1;
        public string? WarrantyPeriod { get; set; } // e.g., "12 months", "50000 km"
        public string? Notes { get; set; }
    }

    public class UpdateVehicleExpenseDto
    {
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public string Category { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? InvoiceNumber { get; set; }
        public string? Vendor { get; set; }
        
        // Enhanced fields
        public string? ReceiptImageData { get; set; }
        public string? ReceiptFileName { get; set; }
        public bool IsMechanical { get; set; } = false;
        public string? MechanicalCategory { get; set; }
        public List<MechanicalPartDto>? PartsReplaced { get; set; }
        public string? LaborDescription { get; set; }
        public decimal? LaborCost { get; set; }
        public decimal? PartsCost { get; set; }
        public string? MechanicName { get; set; }
        public string? WarrantyInfo { get; set; }
        public int? OdometerReading { get; set; }
        public DateTime? NextServiceDate { get; set; }
    }

    public class VehicleExpenseDto
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public string Category { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? InvoiceNumber { get; set; }
        public string? Vendor { get; set; }
        public DateTime CreatedAt { get; set; }
        
        // Enhanced fields
        public string? ReceiptImageUrl { get; set; }
        public string? ReceiptFileName { get; set; }
        public string? ReceiptFileUrl { get; set; }
        public bool HasReceipt { get; set; }
        public bool IsMechanical { get; set; }
        public string? MechanicalCategory { get; set; }
        public List<MechanicalPartDto>? PartsReplaced { get; set; }
        public string? LaborDescription { get; set; }
        public decimal? LaborCost { get; set; }
        public decimal? PartsCost { get; set; }
        public string? MechanicName { get; set; }
        public string? WarrantyInfo { get; set; }
        public int? OdometerReading { get; set; }
        public DateTime? NextServiceDate { get; set; }
    }

    public class ExpenseSummaryDto
    {
        public Guid VehicleId { get; set; }
        public string VehicleRegistration { get; set; } = string.Empty;
        public decimal TotalExpenses { get; set; }
        public decimal ThisMonthExpenses { get; set; }
        public decimal LastMonthExpenses { get; set; }
        public int ExpenseCount { get; set; }
        public Dictionary<string, decimal> CategoryBreakdown { get; set; } = new();
        public List<VehicleExpenseDto> RecentExpenses { get; set; } = new();
    }

    public class MechanicalCategoryDto
    {
        public string Category { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public List<string> SubCategories { get; set; } = new();
        public List<string> CommonParts { get; set; } = new();
    }

    public static class MechanicalCategories
    {
        public static readonly List<MechanicalCategoryDto> Categories = new()
        {
            new MechanicalCategoryDto
            {
                Category = "Engine",
                DisplayName = "Engine & Powertrain",
                SubCategories = new() { "Engine Repair", "Transmission", "Clutch", "Exhaust", "Cooling System" },
                CommonParts = new() { "Oil Filter", "Air Filter", "Spark Plugs", "Timing Belt", "Water Pump", "Alternator" }
            },
            new MechanicalCategoryDto
            {
                Category = "Brakes",
                DisplayName = "Braking System",
                SubCategories = new() { "Brake Pads", "Brake Discs", "Brake Fluid", "ABS System" },
                CommonParts = new() { "Brake Pads", "Brake Discs", "Brake Calipers", "Brake Lines", "Brake Fluid" }
            },
            new MechanicalCategoryDto
            {
                Category = "Suspension",
                DisplayName = "Suspension & Steering",
                SubCategories = new() { "Shock Absorbers", "Struts", "Springs", "Wheel Alignment", "Steering" },
                CommonParts = new() { "Shock Absorbers", "Struts", "Coil Springs", "Ball Joints", "Tie Rods", "Control Arms" }
            },
            new MechanicalCategoryDto
            {
                Category = "Electrical",
                DisplayName = "Electrical System",
                SubCategories = new() { "Battery", "Starter", "Alternator", "Wiring", "Lights" },
                CommonParts = new() { "Battery", "Spark Plug Wires", "Fuses", "Light Bulbs", "Starter Motor" }
            },
            new MechanicalCategoryDto
            {
                Category = "Tires",
                DisplayName = "Tires & Wheels",
                SubCategories = new() { "Tire Replacement", "Wheel Alignment", "Tire Rotation", "Puncture Repair" },
                CommonParts = new() { "Tires", "Wheel Bearings", "Valve Stems", "Wheel Nuts", "Rim" }
            },
            new MechanicalCategoryDto
            {
                Category = "Body",
                DisplayName = "Body & Interior",
                SubCategories = new() { "Body Repair", "Paint", "Interior", "Windows", "Locks" },
                CommonParts = new() { "Door Handles", "Window Regulators", "Mirrors", "Headlights", "Tail Lights" }
            },
            new MechanicalCategoryDto
            {
                Category = "Service",
                DisplayName = "Regular Service",
                SubCategories = new() { "Oil Change", "Filter Change", "Fluid Service", "Inspection" },
                CommonParts = new() { "Engine Oil", "Oil Filter", "Air Filter", "Fuel Filter", "Transmission Fluid" }
            }
        };
    }
}
