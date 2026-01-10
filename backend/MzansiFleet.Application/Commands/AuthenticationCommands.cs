using System;

namespace MzansiFleet.Application.Commands
{
    public class LoginCommand
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }

    public class LogoutCommand
    {
        public string Token { get; set; }
        public Guid UserId { get; set; }
    }
}
