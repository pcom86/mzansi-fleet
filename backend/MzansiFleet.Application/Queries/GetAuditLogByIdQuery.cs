using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Queries
{
    public class GetAuditLogByIdQuery : IRequest<AuditLog>
    {
        public Guid Id { get; set; }
    }
}

