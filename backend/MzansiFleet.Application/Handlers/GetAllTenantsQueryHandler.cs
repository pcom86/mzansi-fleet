using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetAllTenantsQueryHandler : IRequestHandler<GetAllTenantsQuery, IEnumerable<Tenant>>
    {
        private readonly ITenantRepository _repository;
        public GetAllTenantsQueryHandler(ITenantRepository repository)
        {
            _repository = repository;
        }
        public Task<IEnumerable<Tenant>> Handle(GetAllTenantsQuery request, CancellationToken cancellationToken)
        {
            var entities = _repository.GetAll();
            return Task.FromResult(entities);
        }
    }
}

