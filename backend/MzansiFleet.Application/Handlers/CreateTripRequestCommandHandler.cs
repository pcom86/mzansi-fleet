using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class CreateTripRequestCommandHandler : IRequestHandler<CreateTripRequestCommand, TripRequest>
    {
        private readonly ITripRequestRepository _repository;
        private readonly IRouteRepository _routeRepository;

        public CreateTripRequestCommandHandler(ITripRequestRepository repository, IRouteRepository routeRepository)
        {
            _repository = repository;
            _routeRepository = routeRepository;
        }

        public async Task<TripRequest> Handle(CreateTripRequestCommand request, CancellationToken cancellationToken)
        {
            decimal standardFare = 0;

            if (request.RouteId.HasValue)
            {
                var route = await _routeRepository.GetByIdAsync(request.RouteId.Value);
                if (route != null)
                    standardFare = route.StandardFare;
            }

            int pax = request.Passengers > 0 ? request.Passengers : 1;
            decimal totalPrice = standardFare > 0 ? standardFare * pax : 0;

            var entity = new TripRequest
            {
                Id = System.Guid.NewGuid(),
                PassengerId = request.PassengerId,
                TaxiRankId = request.TaxiRankId,
                RouteId = request.RouteId,
                PickupLocation = request.PickupLocation,
                DropoffLocation = request.DropoffLocation,
                RequestedTime = request.PickupTime,
                PassengerCount = pax,
                State = request.Status,
                Notes = request.Notes,
                RatePerKm = standardFare,
                TotalPrice = totalPrice,
            };
            _repository.Add(entity);
            return entity;
        }
    }
}
