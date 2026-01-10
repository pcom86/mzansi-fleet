using System;

namespace MzansiFleet.Domain.Entities
{
    public class ServiceHistory
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public DateTime ServiceDate { get; set; }
        public string ServiceType { get; set; } // Routine, Major, Minor, etc.
        public string Description { get; set; }
        public int MileageAtService { get; set; }
        public decimal Cost { get; set; }
        public string ServiceProvider { get; set; }
        public DateTime? NextServiceDate { get; set; }
        public int? NextServiceMileage { get; set; }
        public string Notes { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
