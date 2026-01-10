using System;
using MediatR;

namespace MzansiFleet.Application.Commands
{
    public class DeleteOwnerProfileCommand : IRequest<bool>
    {
        public Guid Id { get; set; }
    }
}

