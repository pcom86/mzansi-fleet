using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MzansiFleet.Domain.Entities
{
    public class StuffRequest
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid PassengerId { get; set; } // User making the request

        [Required]
        [MaxLength(200)]
        public string ItemDescription { get; set; } = string.Empty;

        [MaxLength(50)]
        public string ItemCategory { get; set; } = "General"; // Furniture, Electronics, Food, Documents, etc.

        public decimal? EstimatedWeight { get; set; } // in kg

        [MaxLength(100)]
        public string Size { get; set; } = string.Empty; // Small, Medium, Large or dimensions

        [Required]
        [MaxLength(500)]
        public string PickupLocation { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string DeliveryLocation { get; set; } = string.Empty;

        public decimal? EstimatedDistance { get; set; } // in km

        [Required]
        public DateTime RequestedPickupDate { get; set; }

        public DateTime? RequestedDeliveryDate { get; set; }

        [MaxLength(50)]
        public string Priority { get; set; } = "Normal"; // Urgent, Normal, Flexible

        [MaxLength(1000)]
        public string SpecialInstructions { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // Pending, QuotesReceived, Approved, InTransit, Delivered, Cancelled

        public Guid? ApprovedQuoteId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        public virtual ICollection<StuffQuote> Quotes { get; set; } = new List<StuffQuote>();
    }

    public class StuffQuote
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid StuffRequestId { get; set; }

        [Required]
        public Guid OwnerId { get; set; }

        public Guid? VehicleId { get; set; }

        [Required]
        public decimal QuotedPrice { get; set; }

        [MaxLength(1000)]
        public string Notes { get; set; } = string.Empty;

        public DateTime? EstimatedPickupTime { get; set; }

        public DateTime? EstimatedDeliveryTime { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected, Expired

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        [ForeignKey("StuffRequestId")]
        public virtual StuffRequest? StuffRequest { get; set; }
    }
}
