using System;
using MediatR;

namespace MzansiFleet.Application.Commands
{
    public class DeleteTenantCommand : IRequest<bool>
    {
        public Guid Id { get; set; }
    }
}

