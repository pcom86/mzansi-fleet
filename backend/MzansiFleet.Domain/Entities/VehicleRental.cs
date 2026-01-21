using System;
using System.Collections.Generic;

namespace MzansiFleet.Domain.Entities
{
    // User posts a request for vehicle rental
    public class VehicleRentalRequest
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; } // User requesting the rental
        public Guid TenantId { get; set; } // User's tenant
        public string VehicleType { get; set; } = string.Empty; // Sedan, SUV, Minibus, etc.
        public int? SeatingCapacity { get; set; } // Minimum seats needed
        public string PickupLocation { get; set; } = string.Empty;
        public string DropoffLocation { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int DurationDays { get; set; }
        public string TripPurpose { get; set; } = string.Empty; // Business, Personal, Event, etc.
        public string SpecialRequirements { get; set; } = string.Empty;
        public decimal? BudgetMin { get; set; }
        public decimal? BudgetMax { get; set; }
        public string Status { get; set; } = "Open"; // Open, Closed, Accepted, Cancelled
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ClosedAt { get; set; }
        public Guid? AcceptedOfferId { get; set; }
        
        // Navigation
        public User? User { get; set; }
        public ICollection<RentalOffer> Offers { get; set; } = new List<RentalOffer>();
    }

    // Owner responds with an offer for their vehicle
    public class RentalOffer
    {
        public Guid Id { get; set; }
        public Guid RentalRequestId { get; set; }
        public Guid OwnerId { get; set; } // OwnerProfile ID
        public Guid VehicleId { get; set; }
        public decimal PricePerDay { get; set; }
        public decimal TotalPrice { get; set; }
        public string OfferMessage { get; set; } = string.Empty;
        public string TermsAndConditions { get; set; } = string.Empty;
        public bool IncludesDriver { get; set; }
        public decimal? DriverFee { get; set; }
        public bool IncludesInsurance { get; set; }
        public decimal? SecurityDeposit { get; set; }
        public string Status { get; set; } = "Pending"; // Pending, Accepted, Rejected, Withdrawn
        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResponsedAt { get; set; }
        
        // Navigation
        public VehicleRentalRequest? RentalRequest { get; set; }
        public OwnerProfile? Owner { get; set; }
        public Vehicle? Vehicle { get; set; }
    }

    // Accepted rental booking
    public class VehicleRentalBooking
    {
        public Guid Id { get; set; }
        public Guid RentalRequestId { get; set; }
        public Guid RentalOfferId { get; set; }
        public Guid RenterId { get; set; } // User who requested
        public Guid OwnerId { get; set; } // Owner who provided vehicle
        public Guid VehicleId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int DurationDays { get; set; }
        public decimal TotalAmount { get; set; }
        public string PickupLocation { get; set; } = string.Empty;
        public string DropoffLocation { get; set; } = string.Empty;
        public string Status { get; set; } = "Confirmed"; // Confirmed, Active, Completed, Cancelled
        public DateTime BookedAt { get; set; } = DateTime.UtcNow;
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? CancellationReason { get; set; }
        public DateTime? CancelledAt { get; set; }
        
        // Navigation
        public VehicleRentalRequest? RentalRequest { get; set; }
        public RentalOffer? RentalOffer { get; set; }
        public User? Renter { get; set; }
        public OwnerProfile? Owner { get; set; }
        public Vehicle? Vehicle { get; set; }
    }
}
