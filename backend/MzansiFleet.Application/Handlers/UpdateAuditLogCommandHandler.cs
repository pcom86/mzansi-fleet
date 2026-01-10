using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class UpdateAuditLogCommandHandler : IRequestHandler<UpdateAuditLogCommand, AuditLog>
    {
        private readonly IAuditLogRepository _repository;
        public UpdateAuditLogCommandHandler(IAuditLogRepository repository)
        {
            _repository = repository;
        }
        public Task<AuditLog> Handle(UpdateAuditLogCommand request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            if (entity == null) return Task.FromResult<AuditLog>(null);
            entity.Details = request.Details;
            entity.Timestamp = request.Timestamp;
            entity.EntityId = request.EntityId;
            entity.EntityType = request.EntityType;
            entity.Action = request.Action;
            entity.UserId = request.UserId;
            _repository.Update(entity);
            return Task.FromResult(entity);
        }
    }
}

