using System;

namespace MzansiFleet.Domain.Entities
{
    public class StaffProfile
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Role { get; set; } // FleetManager, Accountant
        public User User { get; set; }
    }

    public class DriverProfile
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Name { get; set; }
        public string IdNumber { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string PhotoUrl { get; set; }
        public string LicenseCopy { get; set; }
        public string Experience { get; set; }
        public string Category { get; set; }
        public bool HasPdp { get; set; }
        public string PdpCopy { get; set; }
        public bool IsActive { get; set; }
        public bool IsAvailable { get; set; }
        public Guid? AssignedVehicleId { get; set; }
        public User User { get; set; }
    }

    public class PassengerProfile
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Name { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public User User { get; set; }
    }

    public class MechanicProfile
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string BusinessName { get; set; }
        public string Contact { get; set; }
        public string ServiceLocation { get; set; }
        public double? ServiceRadiusKm { get; set; }
        public string Categories { get; set; }
        public string VehicleTypes { get; set; }
        public bool IsActive { get; set; }
        public decimal? DefaultCallOutFee { get; set; }
        public User User { get; set; }
    }

    public class ShopProfile
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string ShopName { get; set; }
        public string Address { get; set; }
        public string Hours { get; set; }
        public string Contact { get; set; }
        public string FulfillmentOptions { get; set; }
        public bool IsActive { get; set; }
        public User User { get; set; }
    }

    public class ServiceProviderProfile
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string BusinessName { get; set; }
        public string RegistrationNumber { get; set; }
        public string ContactPerson { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string Address { get; set; }
        public string ServiceTypes { get; set; } // Mechanical, Electrical, Bodywork, Towing, etc. (comma-separated)
        public string VehicleCategories { get; set; } // Sedan, SUV, Truck, Bus, etc. (comma-separated)
        public string OperatingHours { get; set; }
        public bool IsActive { get; set; }
        public bool IsAvailable { get; set; }
        public decimal? HourlyRate { get; set; }
        public decimal? CallOutFee { get; set; }
        public double? ServiceRadiusKm { get; set; }
        public string BankAccount { get; set; }
        public string TaxNumber { get; set; }
        public string CertificationsLicenses { get; set; }
        public double? Rating { get; set; }
        public int? TotalReviews { get; set; }
        public string Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public User User { get; set; }
    }

    public class ServiceProvider
    {
        public Guid Id { get; set; }
        public string BusinessName { get; set; }
        public string RegistrationNumber { get; set; }
        public string ContactPerson { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string Address { get; set; }
        public string ServiceTypes { get; set; } // Mechanical, Electrical, Bodywork, Towing, etc. (comma-separated)
        public string VehicleCategories { get; set; } // Sedan, SUV, Truck, Bus, etc. (comma-separated)
        public string OperatingHours { get; set; }
        public bool IsActive { get; set; }
        public decimal? HourlyRate { get; set; }
        public decimal? CallOutFee { get; set; }
        public double? ServiceRadiusKm { get; set; }
        public string BankAccount { get; set; }
        public string TaxNumber { get; set; }
        public string CertificationsLicenses { get; set; }
        public double? Rating { get; set; }
        public int? TotalReviews { get; set; }
        public string Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}

