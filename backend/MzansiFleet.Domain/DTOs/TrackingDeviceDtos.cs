using System;

namespace MzansiFleet.Domain.DTOs
{
    // DTO for creating a tracking device installation request
    public class CreateTrackingDeviceRequestDto
    {
        public Guid VehicleId { get; set; }
        public string PreferredInstallationDate { get; set; } = string.Empty;
        public string InstallationLocation { get; set; } = string.Empty;
        public string DeviceFeatures { get; set; } = string.Empty;
        public string SpecialRequirements { get; set; } = string.Empty;
        public decimal? BudgetMin { get; set; }
        public decimal? BudgetMax { get; set; }
    }
    
    // DTO for tracking device request with full details
    public class TrackingDeviceRequestDto
    {
        public Guid Id { get; set; }
        public Guid OwnerId { get; set; }
        public string OwnerName { get; set; } = string.Empty;
        public string OwnerEmail { get; set; } = string.Empty;
        public string OwnerPhone { get; set; } = string.Empty;
        public Guid TenantId { get; set; }
        public Guid VehicleId { get; set; }
        public string VehicleRegistration { get; set; } = string.Empty;
        public string VehicleMake { get; set; } = string.Empty;
        public string VehicleModel { get; set; } = string.Empty;
        public int VehicleYear { get; set; }
        public string PreferredInstallationDate { get; set; } = string.Empty;
        public string InstallationLocation { get; set; } = string.Empty;
        public string DeviceFeatures { get; set; } = string.Empty;
        public string SpecialRequirements { get; set; } = string.Empty;
        public decimal? BudgetMin { get; set; }
        public decimal? BudgetMax { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public int OfferCount { get; set; }
        public bool HasMyOffer { get; set; } // For service providers
    }
    
    // DTO for creating a tracking device offer
    public class CreateTrackingDeviceOfferDto
    {
        public Guid TrackingDeviceRequestId { get; set; }
        public string DeviceBrand { get; set; } = string.Empty;
        public string DeviceModel { get; set; } = string.Empty;
        public string DeviceFeatures { get; set; } = string.Empty;
        public string InstallationDetails { get; set; } = string.Empty;
        public decimal DeviceCost { get; set; }
        public decimal InstallationCost { get; set; }
        public decimal MonthlySubscriptionFee { get; set; }
        public string WarrantyPeriod { get; set; } = string.Empty;
        public string SupportDetails { get; set; } = string.Empty;
        public DateTime AvailableFrom { get; set; }
        public string EstimatedInstallationTime { get; set; } = string.Empty;
        public string AdditionalNotes { get; set; } = string.Empty;
    }
    
    // DTO for tracking device offer with full details
    public class TrackingDeviceOfferDto
    {
        public Guid Id { get; set; }
        public Guid TrackingDeviceRequestId { get; set; }
        public Guid ServiceProviderId { get; set; }
        public string ServiceProviderName { get; set; } = string.Empty;
        public string ServiceProviderPhone { get; set; } = string.Empty;
        public string ServiceProviderEmail { get; set; } = string.Empty;
        public string ServiceProviderAddress { get; set; } = string.Empty;
        public double? ServiceProviderRating { get; set; }
        public int? ServiceProviderReviews { get; set; }
        public string DeviceBrand { get; set; } = string.Empty;
        public string DeviceModel { get; set; } = string.Empty;
        public string DeviceFeatures { get; set; } = string.Empty;
        public string InstallationDetails { get; set; } = string.Empty;
        public decimal DeviceCost { get; set; }
        public decimal InstallationCost { get; set; }
        public decimal MonthlySubscriptionFee { get; set; }
        public decimal TotalUpfrontCost { get; set; }
        public string WarrantyPeriod { get; set; } = string.Empty;
        public string SupportDetails { get; set; } = string.Empty;
        public DateTime AvailableFrom { get; set; }
        public string EstimatedInstallationTime { get; set; } = string.Empty;
        public string AdditionalNotes { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime SubmittedAt { get; set; }
    }
    
    // DTO for accepting an offer
    public class AcceptTrackingDeviceOfferDto
    {
        public Guid OfferId { get; set; }
        public string InstallationNotes { get; set; } = string.Empty;
    }
}
