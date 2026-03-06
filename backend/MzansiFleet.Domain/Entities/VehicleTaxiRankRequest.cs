#nullable enable
using System;

namespace MzansiFleet.Domain.Entities
{
    public class VehicleTaxiRankRequest
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public Guid TaxiRankId { get; set; }
        public Guid RequestedByUserId { get; set; }
        public string? RequestedByName { get; set; }
        public string? VehicleRegistration { get; set; }
        public string? TaxiRankName { get; set; }
        public string? Status { get; set; } = "Pending";
        public string? Notes { get; set; }
        public DateTime RequestedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public Guid? ReviewedByUserId { get; set; }
        public string? ReviewedByName { get; set; }
        public string? RejectionReason { get; set; }
    }
}
