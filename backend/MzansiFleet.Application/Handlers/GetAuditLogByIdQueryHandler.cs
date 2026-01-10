using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetAuditLogByIdQueryHandler : IRequestHandler<GetAuditLogByIdQuery, AuditLog>
    {
        private readonly IAuditLogRepository _repository;
        public GetAuditLogByIdQueryHandler(IAuditLogRepository repository)
        {
            _repository = repository;
        }
        public Task<AuditLog> Handle(GetAuditLogByIdQuery request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            return Task.FromResult(entity);
        }
    }
}

