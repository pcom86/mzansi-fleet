using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetAllOwnerProfilesQueryHandler : IRequestHandler<GetAllOwnerProfilesQuery, IEnumerable<OwnerProfile>>
    {
        private readonly IOwnerProfileRepository _repository;
        public GetAllOwnerProfilesQueryHandler(IOwnerProfileRepository repository)
        {
            _repository = repository;
        }
        public Task<IEnumerable<OwnerProfile>> Handle(GetAllOwnerProfilesQuery request, CancellationToken cancellationToken)
        {
            var entities = _repository.GetAll();
            return Task.FromResult(entities);
        }
    }
}

