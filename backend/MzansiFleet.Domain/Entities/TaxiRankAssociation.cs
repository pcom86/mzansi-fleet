using System;

namespace MzansiFleet.Domain.Entities
{
    /// <summary>
    /// Junction table for many-to-many relationship between TaxiRank and Tenant (Association)
    /// A taxi rank can be assigned to multiple associations
    /// </summary>
    public class TaxiRankAssociation
    {
        public Guid Id { get; set; }
        public Guid TaxiRankId { get; set; }
        public Guid TenantId { get; set; }
        
        // Indicates if this is the primary/owner association for the rank
        public bool IsPrimary { get; set; } = false;
        
        // When this association was established
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        
        // Optional notes about this association
        public string? Notes { get; set; }
        
        // Navigation Properties
        public TaxiRank TaxiRank { get; set; } = null!;
        public Tenant Tenant { get; set; } = null!;
    }
}
