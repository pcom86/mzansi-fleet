using System;
using MediatR;

namespace MzansiFleet.Application.Commands
{
    public class DeleteStaffProfileCommand : IRequest<bool>
    {
        public Guid Id { get; set; }
    }
}

