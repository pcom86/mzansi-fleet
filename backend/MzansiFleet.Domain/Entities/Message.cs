using System;

namespace MzansiFleet.Domain.Entities
{
    public class Message
    {
        public Guid Id { get; set; }
        public Guid SenderId { get; set; }
        public Guid ReceiverId { get; set; }
        public string Subject { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ReadAt { get; set; }
        
        // Optional: Link to related entity (maintenance request, tender, etc.)
        public string? RelatedEntityType { get; set; } // "MaintenanceRequest", "Tender", "RentalRequest", etc.
        public Guid? RelatedEntityId { get; set; }
        
        // For threading/replies
        public Guid? ParentMessageId { get; set; }
        
        // Soft delete
        public bool IsDeletedBySender { get; set; }
        public bool IsDeletedByReceiver { get; set; }
    }
}
