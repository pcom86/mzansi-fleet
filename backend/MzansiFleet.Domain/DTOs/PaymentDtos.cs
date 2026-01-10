using System;

namespace MzansiFleet.Domain.DTOs
{
    public class PaymentIntentDto
    {
        public Guid Id { get; set; }
        public Guid PayerId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; }
        public string State { get; set; }
        public DateTime CreatedAt { get; set; }
    }
    public class PaymentTransactionDto
    {
        public Guid Id { get; set; }
        public Guid PaymentIntentId { get; set; }
        public string Type { get; set; }
        public decimal Amount { get; set; }
        public string State { get; set; }
        public DateTime CreatedAt { get; set; }
    }
    public class LedgerEntryDto
    {
        public Guid Id { get; set; }
        public Guid RelatedEntityId { get; set; }
        public string EntityType { get; set; }
        public decimal Amount { get; set; }
        public string Type { get; set; }
        public DateTime CreatedAt { get; set; }
    }
    public class PayoutBatchDto
    {
        public Guid Id { get; set; }
        public DateTime ScheduledAt { get; set; }
        public string State { get; set; }
    }
    public class PayoutItemDto
    {
        public Guid Id { get; set; }
        public Guid PayoutBatchId { get; set; }
        public Guid PayeeId { get; set; }
        public decimal Amount { get; set; }
        public string State { get; set; }
    }
    public class DisputeCaseDto
    {
        public Guid Id { get; set; }
        public Guid RelatedEntityId { get; set; }
        public string EntityType { get; set; }
        public string Reason { get; set; }
        public string State { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}

