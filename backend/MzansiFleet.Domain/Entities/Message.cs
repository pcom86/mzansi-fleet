using System;

namespace MzansiFleet.Domain.Entities
{
    public class Message
    {
        public Guid Id { get; set; }
        
        // Sender information
        public string SenderType { get; set; } // Admin, Marshal, Driver, System
        public Guid? SenderId { get; set; }
        public string SenderName { get; set; }
        
        // Recipient information
        public string RecipientType { get; set; } // Admin, Marshal, Driver, All
        public Guid? RecipientId { get; set; }
        public Guid? RecipientMarshalId { get; set; }
        public Guid? RecipientDriverId { get; set; }
        
        // Taxi rank context
        public Guid TaxiRankId { get; set; }
        
        // Message content
        public string Subject { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string MessageType { get; set; } // Info, Alert, Request, Response
        
        // Status
        public bool IsRead { get; set; }
        public DateTime? ReadAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
        
        // Optional: Link to related entity (maintenance request, tender, etc.)
        public string? RelatedEntityType { get; set; } // "MaintenanceRequest", "Tender", "RentalRequest", etc.
        public Guid? RelatedEntityId { get; set; }
        
        // For threading/replies
        public Guid? ParentMessageId { get; set; }
        
        // Soft delete
        public bool IsDeletedBySender { get; set; }
        public bool IsDeletedByReceiver { get; set; }
        
        // Navigation properties
        public TaxiRank TaxiRank { get; set; }
    }
}
