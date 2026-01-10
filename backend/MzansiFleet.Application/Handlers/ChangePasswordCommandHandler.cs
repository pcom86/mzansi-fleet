using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, bool>
    {
        private readonly IUserRepository _userRepository;

        public ChangePasswordCommandHandler(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public Task<bool> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
        {
            var user = _userRepository.GetById(request.UserId);
            if (user == null)
            {
                return Task.FromResult(false);
            }

            // Verify current password
            var currentPasswordHash = HashPassword(request.CurrentPassword);
            if (user.PasswordHash != currentPasswordHash)
            {
                return Task.FromResult(false);
            }

            // Hash and update new password
            user.PasswordHash = HashPassword(request.NewPassword);
            _userRepository.Update(user);

            return Task.FromResult(true);
        }

        private string HashPassword(string password)
        {
            using (var sha256 = SHA256.Create())
            {
                var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
                return Convert.ToBase64String(hashedBytes);
            }
        }
    }
}
