using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class DeleteTenantCommandHandler : IRequestHandler<DeleteTenantCommand, bool>
    {
        private readonly ITenantRepository _repository;
        public DeleteTenantCommandHandler(ITenantRepository repository)
        {
            _repository = repository;
        }
        public Task<bool> Handle(DeleteTenantCommand request, CancellationToken cancellationToken)
        {
            _repository.Delete(request.Id);
            return Task.FromResult(true);
        }
    }
}

