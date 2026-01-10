using System;

namespace MzansiFleet.Domain.DTOs
{
    public class VehicleDto
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
        public int Capacity { get; set; }
        public string Type { get; set; }
        public string BaseLocation { get; set; }
        public string Status { get; set; }
    }
    public class VehicleDocumentDto
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public string DocumentType { get; set; }
        public string FileUrl { get; set; }
        public DateTime UploadedAt { get; set; }
    }
    public class MaintenanceEventDto
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public DateTime Date { get; set; }
        public int Odometer { get; set; }
        public string Description { get; set; }
        public string Vendor { get; set; }
        public decimal Cost { get; set; }
        public string Attachments { get; set; }
    }
    public class ServiceRuleDto
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public string RuleType { get; set; }
        public int? IntervalDays { get; set; }
        public int? IntervalKm { get; set; }
    }
    public class PartRuleDto
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public string PartName { get; set; }
        public int? IntervalDays { get; set; }
        public int? IntervalKm { get; set; }
    }
}

