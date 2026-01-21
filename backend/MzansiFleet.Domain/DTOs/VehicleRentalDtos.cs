using System;
using System.Collections.Generic;

namespace MzansiFleet.Domain.DTOs
{
    // User creates rental request
    public class CreateRentalRequestDto
    {
        public string VehicleType { get; set; } = string.Empty;
        public int? SeatingCapacity { get; set; }
        public string PickupLocation { get; set; } = string.Empty;
        public string DropoffLocation { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string TripPurpose { get; set; } = string.Empty;
        public string SpecialRequirements { get; set; } = string.Empty;
        public decimal? BudgetMin { get; set; }
        public decimal? BudgetMax { get; set; }
    }

    // Rental request list/detail
    public class RentalRequestDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public string VehicleType { get; set; } = string.Empty;
        public int? SeatingCapacity { get; set; }
        public string PickupLocation { get; set; } = string.Empty;
        public string DropoffLocation { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int DurationDays { get; set; }
        public string TripPurpose { get; set; } = string.Empty;
        public string SpecialRequirements { get; set; } = string.Empty;
        public decimal? BudgetMin { get; set; }
        public decimal? BudgetMax { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public int OfferCount { get; set; }
        public bool HasMyOffer { get; set; } // For owners to see if they already submitted
    }

    // Owner submits offer
    public class CreateRentalOfferDto
    {
        public Guid RentalRequestId { get; set; }
        public Guid VehicleId { get; set; }
        public decimal PricePerDay { get; set; }
        public string OfferMessage { get; set; } = string.Empty;
        public string TermsAndConditions { get; set; } = string.Empty;
        public bool IncludesDriver { get; set; }
        public decimal? DriverFee { get; set; }
        public bool IncludesInsurance { get; set; }
        public decimal? SecurityDeposit { get; set; }
    }

    // Rental offer details
    public class RentalOfferDto
    {
        public Guid Id { get; set; }
        public Guid RentalRequestId { get; set; }
        public Guid OwnerId { get; set; }
        public string OwnerCompanyName { get; set; } = string.Empty;
        public string OwnerContactName { get; set; } = string.Empty;
        public string OwnerPhone { get; set; } = string.Empty;
        public string OwnerEmail { get; set; } = string.Empty;
        public Guid VehicleId { get; set; }
        public VehicleBasicInfoDto? Vehicle { get; set; }
        public decimal PricePerDay { get; set; }
        public decimal TotalPrice { get; set; }
        public string OfferMessage { get; set; } = string.Empty;
        public string TermsAndConditions { get; set; } = string.Empty;
        public bool IncludesDriver { get; set; }
        public decimal? DriverFee { get; set; }
        public bool IncludesInsurance { get; set; }
        public decimal? SecurityDeposit { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime SubmittedAt { get; set; }
        
        // Flat vehicle properties for frontend
        public string? VehicleMake { get; set; }
        public string? VehicleModel { get; set; }
        public int? VehicleYear { get; set; }
        public string? VehicleRegistration { get; set; }
        public List<string>? VehiclePhotoUrls { get; set; }
        
        // Request information
        public string? RequestVehicleType { get; set; }
        public string? RequestPickupLocation { get; set; }
        public string? RequestDropoffLocation { get; set; }
        public DateTime? RequestStartDate { get; set; }
        public DateTime? RequestEndDate { get; set; }
    }

    // Vehicle info for offers
    public class VehicleBasicInfoDto
    {
        public Guid Id { get; set; }
        public string Registration { get; set; } = string.Empty;
        public string Make { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int Year { get; set; }
        public string Type { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public string Status { get; set; } = string.Empty;
        public List<string> Photos { get; set; } = new List<string>();
    }

    // Accept offer
    public class AcceptRentalOfferDto
    {
        public Guid RentalRequestId { get; set; }
        public Guid OfferId { get; set; }
    }

    // Reject offer
    public class RejectRentalOfferDto
    {
        public Guid RentalRequestId { get; set; }
        public Guid OfferId { get; set; }
    }

    // Booking details
    public class RentalBookingDto
    {
        public Guid Id { get; set; }
        public Guid RentalRequestId { get; set; }
        public Guid RenterId { get; set; }
        public string RenterName { get; set; } = string.Empty;
        public Guid OwnerId { get; set; }
        public string OwnerCompanyName { get; set; } = string.Empty;
        public string OwnerContactName { get; set; } = string.Empty;
        public string OwnerPhone { get; set; } = string.Empty;
        public VehicleBasicInfoDto? Vehicle { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int DurationDays { get; set; }
        public decimal TotalAmount { get; set; }
        public string PickupLocation { get; set; } = string.Empty;
        public string DropoffLocation { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime BookedAt { get; set; }
    }
}
