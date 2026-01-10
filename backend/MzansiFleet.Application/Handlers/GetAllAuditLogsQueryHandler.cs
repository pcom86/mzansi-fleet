using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetAllAuditLogsQueryHandler : IRequestHandler<GetAllAuditLogsQuery, IEnumerable<AuditLog>>
    {
        private readonly IAuditLogRepository _repository;
        public GetAllAuditLogsQueryHandler(IAuditLogRepository repository)
        {
            _repository = repository;
        }
        public Task<IEnumerable<AuditLog>> Handle(GetAllAuditLogsQuery request, CancellationToken cancellationToken)
        {
            var entities = _repository.GetAll();
            return Task.FromResult(entities);
        }
    }
}

