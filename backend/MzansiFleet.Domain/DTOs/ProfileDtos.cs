using System;

namespace MzansiFleet.Domain.DTOs
{
    public class StaffProfileDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Role { get; set; }
    }
    public class DriverProfileDto
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
    }
    public class PassengerProfileDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Name { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
    }
    public class MechanicProfileDto
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
    }
    public class ShopProfileDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string ShopName { get; set; }
        public string Address { get; set; }
        public string Hours { get; set; }
        public string Contact { get; set; }
        public string FulfillmentOptions { get; set; }
        public bool IsActive { get; set; }
    }

    public class ServiceProviderProfileDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string BusinessName { get; set; }
        public string RegistrationNumber { get; set; }
        public string ContactPerson { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string Address { get; set; }
        public string ServiceTypes { get; set; }
        public string VehicleCategories { get; set; }
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
    }

    public class CreateServiceProviderProfileDto
    {
        public Guid UserId { get; set; }
        public string BusinessName { get; set; }
        public string RegistrationNumber { get; set; }
        public string ContactPerson { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string Address { get; set; }
        public string ServiceTypes { get; set; }
        public string VehicleCategories { get; set; }
        public string OperatingHours { get; set; }
        public decimal? HourlyRate { get; set; }
        public decimal? CallOutFee { get; set; }
        public double? ServiceRadiusKm { get; set; }
        public string BankAccount { get; set; }
        public string TaxNumber { get; set; }
        public string CertificationsLicenses { get; set; }
        public string Notes { get; set; }
    }

    public class ServiceProviderDto
    {
        public Guid Id { get; set; }
        public string BusinessName { get; set; }
        public string RegistrationNumber { get; set; }
        public string ContactPerson { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string Address { get; set; }
        public string ServiceTypes { get; set; }
        public string VehicleCategories { get; set; }
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

    public class CreateServiceProviderDto
    {
        public string BusinessName { get; set; }
        public string RegistrationNumber { get; set; }
        public string ContactPerson { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string Address { get; set; }
        public string ServiceTypes { get; set; }
        public string VehicleCategories { get; set; }
        public string OperatingHours { get; set; }
        public decimal? HourlyRate { get; set; }
        public decimal? CallOutFee { get; set; }
        public double? ServiceRadiusKm { get; set; }
        public string BankAccount { get; set; }
        public string TaxNumber { get; set; }
        public string CertificationsLicenses { get; set; }
        public string Notes { get; set; }
    }

    public class UpdateServiceProviderDto
    {
        public string BusinessName { get; set; }
        public string RegistrationNumber { get; set; }
        public string ContactPerson { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string Address { get; set; }
        public string ServiceTypes { get; set; }
        public string VehicleCategories { get; set; }
        public string OperatingHours { get; set; }
        public bool IsActive { get; set; }
        public decimal? HourlyRate { get; set; }
        public decimal? CallOutFee { get; set; }
        public double? ServiceRadiusKm { get; set; }
        public string BankAccount { get; set; }
        public string TaxNumber { get; set; }
        public string CertificationsLicenses { get; set; }
        public string Notes { get; set; }
    }

    public class RegisterServiceProviderDto
    {
        // User Account Details
        public Guid TenantId { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string Phone { get; set; }
        
        // Service Provider Profile Details
        public string BusinessName { get; set; }
        public string RegistrationNumber { get; set; }
        public string ContactPerson { get; set; }
        public string Address { get; set; }
        public string ServiceTypes { get; set; }
        public string VehicleCategories { get; set; }
        public string OperatingHours { get; set; }
        public decimal? HourlyRate { get; set; }
        public decimal? CallOutFee { get; set; }
        public double? ServiceRadiusKm { get; set; }
        public string BankAccount { get; set; }
        public string TaxNumber { get; set; }
        public string CertificationsLicenses { get; set; }
        public string Notes { get; set; }
    }
}

