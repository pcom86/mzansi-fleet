using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Commands
{
    public class UpdateStaffProfileCommand : IRequest<StaffProfile>
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Role { get; set; }
    }
}
