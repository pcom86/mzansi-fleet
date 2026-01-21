using System;
using System.Collections.Generic;

namespace MzansiFleet.Domain.Entities
{
    public class Tender
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string RequirementDetails { get; set; } = string.Empty;
        
        // Budget range
        public decimal? BudgetMin { get; set; }
        public decimal? BudgetMax { get; set; }
        
        // Transport details
        public string TransportType { get; set; } = string.Empty; // e.g., "Passenger", "Goods", "Mixed"
        public int? RequiredVehicles { get; set; }
        public string RouteDetails { get; set; } = string.Empty;
        
        // Timeline
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public DateTime? ApplicationDeadline { get; set; }
        
        // Location
        public string PickupLocation { get; set; } = string.Empty;
        public string DropoffLocation { get; set; } = string.Empty;
        public string ServiceArea { get; set; } = string.Empty;
        
        // Publisher info
        public Guid TenderPublisherId { get; set; }
        public User? TenderPublisher { get; set; }
        
        // Status tracking
        public string Status { get; set; } = "Open"; // Open, Closed, Awarded, Cancelled
        public Guid? AwardedToOwnerId { get; set; }
        public OwnerProfile? AwardedToOwner { get; set; }
        
        // Metadata
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsActive { get; set; } = true;
        
        // Navigation properties
        public ICollection<TenderApplication> Applications { get; set; } = new List<TenderApplication>();
    }

    public class TenderApplication
    {
        public Guid Id { get; set; }
        public Guid TenderId { get; set; }
        public Tender? Tender { get; set; }
        
        public Guid OwnerId { get; set; }
        public OwnerProfile? Owner { get; set; }
        
        public string ApplicationMessage { get; set; } = string.Empty;
        public decimal ProposedBudget { get; set; }
        public string ProposalDetails { get; set; } = string.Empty;
        
        // Fleet information summary
        public int AvailableVehicles { get; set; }
        public string VehicleTypes { get; set; } = string.Empty;
        public string ExperienceHighlights { get; set; } = string.Empty;
        
        // Status tracking
        public string Status { get; set; } = "Pending"; // Pending, UnderReview, Accepted, Rejected
        public DateTime AppliedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewNotes { get; set; }
        
        // Contact info
        public string ContactPerson { get; set; } = string.Empty;
        public string ContactPhone { get; set; } = string.Empty;
        public string ContactEmail { get; set; } = string.Empty;
    }
}
