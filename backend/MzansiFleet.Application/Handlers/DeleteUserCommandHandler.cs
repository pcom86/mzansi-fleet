using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, bool>
    {
        private readonly IUserRepository _repository;
        public DeleteUserCommandHandler(IUserRepository repository)
        {
            _repository = repository;
        }
        public Task<bool> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
        {
            _repository.Delete(request.Id);
            return Task.FromResult(true);
        }
    }
}

