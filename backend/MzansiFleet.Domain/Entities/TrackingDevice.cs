using System;

namespace MzansiFleet.Domain.Entities
{
    // Owner requests tracking device installation for their vehicle
    public class TrackingDeviceRequest
    {
        public Guid Id { get; set; }
        public Guid OwnerId { get; set; } // Owner requesting the installation
        public Guid TenantId { get; set; } // Owner's tenant
        public Guid VehicleId { get; set; } // Vehicle to install tracking device on
        
        // Vehicle Details (for service provider reference)
        public string VehicleRegistration { get; set; } = string.Empty;
        public string VehicleMake { get; set; } = string.Empty;
        public string VehicleModel { get; set; } = string.Empty;
        public int VehicleYear { get; set; }
        
        // Installation preferences
        public string PreferredInstallationDate { get; set; } = string.Empty; // Date range or specific date
        public string InstallationLocation { get; set; } = string.Empty; // Where the vehicle is located
        public string DeviceFeatures { get; set; } = string.Empty; // Required features (GPS, Geofencing, Alerts, etc.)
        public string SpecialRequirements { get; set; } = string.Empty; // Any special notes
        
        // Budget
        public decimal? BudgetMin { get; set; }
        public decimal? BudgetMax { get; set; }
        
        // Status
        public string Status { get; set; } = "Open"; // Open, OfferReceived, Accepted, Scheduled, Completed, Cancelled
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public int OfferCount { get; set; } = 0;
        
        // Navigation properties
        public OwnerProfile? Owner { get; set; }
        public Vehicle? Vehicle { get; set; }
    }
    
    // Service provider (tracking company) responds with an offer
    public class TrackingDeviceOffer
    {
        public Guid Id { get; set; }
        public Guid TrackingDeviceRequestId { get; set; }
        public Guid ServiceProviderId { get; set; } // Tracking company making the offer
        
        // Device and service details
        public string DeviceBrand { get; set; } = string.Empty;
        public string DeviceModel { get; set; } = string.Empty;
        public string DeviceFeatures { get; set; } = string.Empty; // GPS, Geofencing, Real-time tracking, Alerts, etc.
        public string InstallationDetails { get; set; } = string.Empty; // How installation will be done
        
        // Pricing
        public decimal DeviceCost { get; set; }
        public decimal InstallationCost { get; set; }
        public decimal MonthlySubscriptionFee { get; set; }
        public decimal TotalUpfrontCost { get; set; } // Device + Installation
        
        // Warranty and support
        public string WarrantyPeriod { get; set; } = string.Empty; // e.g., "12 months", "2 years"
        public string SupportDetails { get; set; } = string.Empty; // 24/7 support, etc.
        
        // Availability
        public DateTime AvailableFrom { get; set; }
        public string EstimatedInstallationTime { get; set; } = string.Empty; // e.g., "1-2 hours"
        
        // Additional notes
        public string AdditionalNotes { get; set; } = string.Empty;
        
        // Status
        public string Status { get; set; } = "Pending"; // Pending, Accepted, Rejected
        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResponsedAt { get; set; }
        
        // Navigation
        public TrackingDeviceRequest? TrackingRequest { get; set; }
        public ServiceProviderProfile? ServiceProvider { get; set; }
    }
}
