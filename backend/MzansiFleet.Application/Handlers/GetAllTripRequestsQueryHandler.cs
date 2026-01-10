using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetAllTripRequestsQueryHandler : IRequestHandler<GetAllTripRequestsQuery, IEnumerable<TripRequest>>
    {
        private readonly ITripRequestRepository _repository;
        public GetAllTripRequestsQueryHandler(ITripRequestRepository repository)
        {
            _repository = repository;
        }
        public Task<IEnumerable<TripRequest>> Handle(GetAllTripRequestsQuery request, CancellationToken cancellationToken)
        {
            var entities = _repository.GetAll();
            return Task.FromResult(entities);
        }
    }
}

