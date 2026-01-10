using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class DeleteAuditLogCommandHandler : IRequestHandler<DeleteAuditLogCommand, bool>
    {
        private readonly IAuditLogRepository _repository;
        public DeleteAuditLogCommandHandler(IAuditLogRepository repository)
        {
            _repository = repository;
        }
        public Task<bool> Handle(DeleteAuditLogCommand request, CancellationToken cancellationToken)
        {
            _repository.Delete(request.Id);
            return Task.FromResult(true);
        }
    }
}

