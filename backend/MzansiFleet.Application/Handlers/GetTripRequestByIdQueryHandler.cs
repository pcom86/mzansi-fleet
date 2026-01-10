using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetTripRequestByIdQueryHandler : IRequestHandler<GetTripRequestByIdQuery, TripRequest>
    {
        private readonly ITripRequestRepository _repository;
        public GetTripRequestByIdQueryHandler(ITripRequestRepository repository)
        {
            _repository = repository;
        }
        public Task<TripRequest> Handle(GetTripRequestByIdQuery request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            return Task.FromResult(entity);
        }
    }
}

