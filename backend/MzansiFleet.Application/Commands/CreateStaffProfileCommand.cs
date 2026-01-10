using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Commands
{
    public class CreateStaffProfileCommand : IRequest<StaffProfile>
    {
        public Guid UserId { get; set; }
        public string Role { get; set; }
    }
}

