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
        public CreateTripRequestCommandHandler(ITripRequestRepository repository)
        {
            _repository = repository;
        }
        public Task<TripRequest> Handle(CreateTripRequestCommand request, CancellationToken cancellationToken)
        {
            var entity = new TripRequest
            {
                Id = System.Guid.NewGuid(),
                PassengerId = request.PassengerId,
                PickupLocation = request.PickupLocation,
                DropoffLocation = request.DropoffLocation,
                RequestedTime = request.PickupTime, // Map PickupTime to RequestedTime
                PassengerCount = request.Passengers, // Map Passengers to PassengerCount
                State = request.Status, // Map Status to State
                Notes = request.Notes
            };
            _repository.Add(entity);
            return Task.FromResult(entity);
        }
    }
}
