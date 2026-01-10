using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class CreateAuditLogCommandHandler : IRequestHandler<CreateAuditLogCommand, AuditLog>
    {
        private readonly IAuditLogRepository _repository;
        public CreateAuditLogCommandHandler(IAuditLogRepository repository)
        {
            _repository = repository;
        }
        public Task<AuditLog> Handle(CreateAuditLogCommand request, CancellationToken cancellationToken)
        {
            var entity = new AuditLog
            {
                Id = System.Guid.NewGuid(),
                Details = request.Details,
                Timestamp = request.Timestamp,
                EntityId = request.EntityId,
                EntityType = request.EntityType,
                Action = request.Action,
                UserId = request.UserId
            };
            _repository.Add(entity);
            return Task.FromResult(entity);
        }
    }
}

