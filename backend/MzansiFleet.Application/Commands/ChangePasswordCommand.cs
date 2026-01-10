using System;
using MediatR;

namespace MzansiFleet.Application.Commands
{
    public class ChangePasswordCommand : IRequest<bool>
    {
        public Guid UserId { get; set; }
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
