using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, User>
    {
        private readonly IUserRepository _repository;
        public CreateUserCommandHandler(IUserRepository repository)
        {
            _repository = repository;
        }
        public Task<User> Handle(CreateUserCommand request, CancellationToken cancellationToken)
        {
            var entity = new User
            {
                Id = System.Guid.NewGuid(),
                TenantId = request.TenantId,
                Email = request.Email,
                Phone = request.Phone,
                PasswordHash = request.PasswordHash,
                Role = request.Role,
                IsActive = request.IsActive
            };
            _repository.Add(entity);
            return Task.FromResult(entity);
        }
    }
}
