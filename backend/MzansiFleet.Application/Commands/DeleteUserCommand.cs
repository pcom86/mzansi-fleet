using System;
using MediatR;

namespace MzansiFleet.Application.Commands
{
    public class DeleteUserCommand : IRequest<bool>
    {
        public Guid Id { get; set; }
    }
}

