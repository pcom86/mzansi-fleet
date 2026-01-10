using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, User>
    {
        private readonly IUserRepository _repository;
        public UpdateUserCommandHandler(IUserRepository repository)
        {
            _repository = repository;
        }
        public Task<User> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            if (entity == null) return Task.FromResult<User>(null);
            entity.TenantId = request.TenantId;
            entity.Email = request.Email;
            entity.Phone = request.Phone;
            entity.PasswordHash = request.PasswordHash;
            entity.Role = request.Role;
            entity.IsActive = request.IsActive;
            _repository.Update(entity);
            return Task.FromResult(entity);
        }
    }
}

