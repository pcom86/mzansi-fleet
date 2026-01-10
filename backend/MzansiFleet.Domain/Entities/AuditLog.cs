using System;

namespace MzansiFleet.Domain.Entities
{
    public class AuditLog
    {
        public string Details { get; set; }
        public DateTime Timestamp { get; set; }
        public Guid? EntityId { get; set; }
        public string EntityType { get; set; }
        public string Action { get; set; }
        public Guid? UserId { get; set; }
        public Guid Id { get; set; }
    }
}


