using System;
using System.Collections.Generic;

namespace MzansiFleet.Domain.Entities
{
    public class PaymentIntent
    {
        public Guid Id { get; set; }
        public Guid PayerId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; }
        public string State { get; set; } // Pending, Succeeded, Failed
        public DateTime CreatedAt { get; set; }
    }

    public class PaymentTransaction
    {
        public Guid Id { get; set; }
        public Guid PaymentIntentId { get; set; }
        public string Type { get; set; } // Payment, Refund, Payout
        public decimal Amount { get; set; }
        public string State { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class LedgerEntry
    {
        public Guid Id { get; set; }
        public Guid RelatedEntityId { get; set; }
        public string EntityType { get; set; }
        public decimal Amount { get; set; }
        public string Type { get; set; } // Payment, Escrow, Commission, Payout, Refund, Chargeback
        public DateTime CreatedAt { get; set; }
    }

    public class PayoutBatch
    {
        public Guid Id { get; set; }
        public DateTime ScheduledAt { get; set; }
        public string State { get; set; }
    }

    public class PayoutItem
    {
        public Guid Id { get; set; }
        public Guid PayoutBatchId { get; set; }
        public Guid PayeeId { get; set; }
        public decimal Amount { get; set; }
        public string State { get; set; }
    }

    public class DisputeCase
    {
        public Guid Id { get; set; }
        public Guid RelatedEntityId { get; set; }
        public string EntityType { get; set; }
        public string Reason { get; set; }
        public string State { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}

