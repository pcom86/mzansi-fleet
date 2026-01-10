using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetAllMechanicalRequestsQueryHandler : IRequestHandler<GetAllMechanicalRequestsQuery, IEnumerable<MechanicalRequest>>
    {
        private readonly IMechanicalRequestRepository _repository;
        public GetAllMechanicalRequestsQueryHandler(IMechanicalRequestRepository repository)
        {
            _repository = repository;
        }
        public Task<IEnumerable<MechanicalRequest>> Handle(GetAllMechanicalRequestsQuery request, CancellationToken cancellationToken)
        {
            var entities = _repository.GetAll();
            return Task.FromResult(entities);
        }
    }
}

