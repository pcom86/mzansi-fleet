using System;
using MediatR;

namespace MzansiFleet.Application.Commands
{
    public class DeleteMechanicalRequestCommand : IRequest<bool>
    {
        public Guid Id { get; set; }
    }
}

