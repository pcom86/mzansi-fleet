using System;

namespace MzansiFleet.Domain.DTOs
{
    public class MechanicalRequestDto
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
        public string State { get; set; }
    }
    public class QuoteDto
    {
        public Guid Id { get; set; }
        public Guid MechanicalRequestId { get; set; }
        public Guid MechanicId { get; set; }
        public decimal LaborFee { get; set; }
        public decimal? CallOutFee { get; set; }
        public DateTime ETA { get; set; }
        public string Notes { get; set; }
        public DateTime Expiry { get; set; }
        public string State { get; set; }
    }
    public class ServiceBookingDto
    {
        public Guid Id { get; set; }
        public Guid MechanicalRequestId { get; set; }
        public Guid QuoteId { get; set; }
        public Guid MechanicId { get; set; }
        public Guid OwnerId { get; set; }
        public string State { get; set; }
        public DateTime? ConfirmedAt { get; set; }
    }
    public class ProductDto
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
    public class InventoryDto
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public int Quantity { get; set; }
    }
    public class OrderDto
    {
        public Guid Id { get; set; }
        public Guid BuyerId { get; set; }
        public Guid ShopId { get; set; }
        public DateTime PlacedAt { get; set; }
        public string FulfillmentOption { get; set; }
        public string State { get; set; }
    }
    public class OrderItemDto
    {
        public Guid Id { get; set; }
        public Guid OrderId { get; set; }
        public Guid ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal Price { get; set; }
    }
}

