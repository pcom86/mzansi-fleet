using System;
using MediatR;

namespace MzansiFleet.Application.Commands
{
    public class DeleteAuditLogCommand : IRequest<bool>
    {
        public Guid Id { get; set; }
    }
}

