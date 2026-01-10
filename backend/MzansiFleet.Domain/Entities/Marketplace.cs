using System;
using System.Collections.Generic;

namespace MzansiFleet.Domain.Entities
{
    public class MechanicalRequest
    {
        public Guid Id { get; set; }
        public Guid OwnerId { get; set; }
        public Guid? VehicleId { get; set; }
        public string Location { get; set; }
        public string Category { get; set; }
        public string Description { get; set; }
        public string MediaUrls { get; set; }
        public DateTime? PreferredTime { get; set; }
        public bool CallOutRequired { get; set; }
        public string State { get; set; } // OPEN, QUOTED, BOOKED, Pending, Approved, Declined, Scheduled, etc.
        public string? Priority { get; set; }
        public Guid? RequestedBy { get; set; }
        public string? RequestedByType { get; set; } // Driver, Owner, Staff
        public DateTime? CreatedAt { get; set; }
        public string? DeclineReason { get; set; }
        public string? ServiceProvider { get; set; }
        public DateTime? ScheduledDate { get; set; }
        public string? ScheduledBy { get; set; } // Driver, Owner
        public DateTime? CompletedDate { get; set; }
        public string? CompletionNotes { get; set; }
        public int? ServiceProviderRating { get; set; } // 1-5 stars rating
    }

    public class Quote
    {
        public Guid Id { get; set; }
        public Guid MechanicalRequestId { get; set; }
        public Guid MechanicId { get; set; }
        public decimal LaborFee { get; set; }
        public decimal? CallOutFee { get; set; }
        public DateTime ETA { get; set; }
        public string Notes { get; set; }
        public DateTime Expiry { get; set; }
        public string State { get; set; } // Pending, Accepted, Expired
    }

    public class ServiceBooking
    {
        public Guid Id { get; set; }
        public Guid MechanicalRequestId { get; set; }
        public Guid QuoteId { get; set; }
        public Guid MechanicId { get; set; }
        public Guid OwnerId { get; set; }
        public string State { get; set; } // PENDING_PAYMENT, CONFIRMED, IN_PROGRESS, COMPLETED, etc.
        public DateTime? ConfirmedAt { get; set; }
    }

    public class Product
    {
        public Guid Id { get; set; }
        public Guid ShopId { get; set; }
        public string SKU { get; set; }
        public string Title { get; set; }
        public string Category { get; set; }
        public string Condition { get; set; }
        public decimal Price { get; set; }
        public int StockQty { get; set; }
        public string PhotoUrls { get; set; }
        public string Compatibility { get; set; }
        public bool IsActive { get; set; }
    }

    public class Inventory
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public int Quantity { get; set; }
    }

    public class Order
    {
        public Guid Id { get; set; }
        public Guid BuyerId { get; set; }
        public Guid ShopId { get; set; }
        public DateTime PlacedAt { get; set; }
        public string FulfillmentOption { get; set; }
        public string State { get; set; } // PLACED, ACCEPTED_BY_SHOP, etc.
    }

    public class OrderItem
    {
        public Guid Id { get; set; }
        public Guid OrderId { get; set; }
        public Guid ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal Price { get; set; }
    }
}

