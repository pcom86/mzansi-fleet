using System;
using System.Collections.Generic;

namespace MzansiFleet.Domain.DTOs
{
    public class CreateTenderDto
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string RequirementDetails { get; set; } = string.Empty;
        public decimal? BudgetMin { get; set; }
        public decimal? BudgetMax { get; set; }
        public string TransportType { get; set; } = string.Empty;
        public int? RequiredVehicles { get; set; }
        public string RouteDetails { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public DateTime? ApplicationDeadline { get; set; }
        public string PickupLocation { get; set; } = string.Empty;
        public string DropoffLocation { get; set; } = string.Empty;
        public string ServiceArea { get; set; } = string.Empty;
    }

    public class TenderDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string RequirementDetails { get; set; } = string.Empty;
        public decimal? BudgetMin { get; set; }
        public decimal? BudgetMax { get; set; }
        public string TransportType { get; set; } = string.Empty;
        public int? RequiredVehicles { get; set; }
        public string RouteDetails { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public DateTime? ApplicationDeadline { get; set; }
        public string PickupLocation { get; set; } = string.Empty;
        public string DropoffLocation { get; set; } = string.Empty;
        public string ServiceArea { get; set; } = string.Empty;
        public Guid TenderPublisherId { get; set; }
        public string PublisherName { get; set; } = string.Empty;
        public string PublisherEmail { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public Guid? AwardedToOwnerId { get; set; }
        public string? AwardedToOwnerName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int ApplicationCount { get; set; }
    }

    public class CreateTenderApplicationDto
    {
        public Guid TenderId { get; set; }
        public string ApplicationMessage { get; set; } = string.Empty;
        public decimal ProposedBudget { get; set; }
        public string ProposalDetails { get; set; } = string.Empty;
        public int AvailableVehicles { get; set; }
        public string VehicleTypes { get; set; } = string.Empty;
        public string ExperienceHighlights { get; set; } = string.Empty;
        public string ContactPerson { get; set; } = string.Empty;
        public string ContactPhone { get; set; } = string.Empty;
        public string ContactEmail { get; set; } = string.Empty;
    }

    public class TenderApplicationDto
    {
        public Guid Id { get; set; }
        public Guid TenderId { get; set; }
        public string TenderTitle { get; set; } = string.Empty;
        public Guid OwnerId { get; set; }
        public string OwnerCompanyName { get; set; } = string.Empty;
        public string OwnerContactName { get; set; } = string.Empty;
        public string ApplicationMessage { get; set; } = string.Empty;
        public decimal ProposedBudget { get; set; }
        public string ProposalDetails { get; set; } = string.Empty;
        public int AvailableVehicles { get; set; }
        public string VehicleTypes { get; set; } = string.Empty;
        public string ExperienceHighlights { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime AppliedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewNotes { get; set; }
        public string ContactPerson { get; set; } = string.Empty;
        public string ContactPhone { get; set; } = string.Empty;
        public string ContactEmail { get; set; } = string.Empty;
        
        // Fleet profile summary
        public OwnerFleetSummaryDto? FleetSummary { get; set; }
    }

    public class OwnerFleetSummaryDto
    {
        public Guid OwnerId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string ContactName { get; set; } = string.Empty;
        public string ContactPhone { get; set; } = string.Empty;
        public string ContactEmail { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public int TotalVehicles { get; set; }
        public int ActiveVehicles { get; set; }
        public List<VehicleSummaryDto> Vehicles { get; set; } = new List<VehicleSummaryDto>();
        public decimal TotalRevenue { get; set; }
        public int CompletedJobs { get; set; }
        public double? AverageRating { get; set; }
    }

    public class VehicleSummaryDto
    {
        public Guid Id { get; set; }
        public string RegistrationNumber { get; set; } = string.Empty;
        public string Make { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int Year { get; set; }
        public string VehicleType { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? Mileage { get; set; }
        public List<string> Photos { get; set; } = new List<string>();
    }

    public class UpdateTenderApplicationStatusDto
    {
        public string Status { get; set; } = string.Empty; // Accepted, Rejected, UnderReview
        public string? ReviewNotes { get; set; }
    }
}
