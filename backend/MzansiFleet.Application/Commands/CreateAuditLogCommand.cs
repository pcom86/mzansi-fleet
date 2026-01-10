using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Commands
{
    public class CreateAuditLogCommand : IRequest<AuditLog>
    {
        public string Details { get; set; }
        public DateTime Timestamp { get; set; }
        public Guid? EntityId { get; set; }
        public string EntityType { get; set; }
        public string Action { get; set; }
        public Guid? UserId { get; set; }
    }
}

