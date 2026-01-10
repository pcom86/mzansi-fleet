using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetTenantByIdQueryHandler : IRequestHandler<GetTenantByIdQuery, Tenant>
    {
        private readonly ITenantRepository _repository;
        public GetTenantByIdQueryHandler(ITenantRepository repository)
        {
            _repository = repository;
        }
        public Task<Tenant> Handle(GetTenantByIdQuery request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            return Task.FromResult(entity);
        }
    }
}

