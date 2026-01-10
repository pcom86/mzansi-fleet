using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class UpdateTripRequestCommandHandler : IRequestHandler<UpdateTripRequestCommand, TripRequest>
    {
        private readonly ITripRequestRepository _repository;
        public UpdateTripRequestCommandHandler(ITripRequestRepository repository)
        {
            _repository = repository;
        }
        public Task<TripRequest> Handle(UpdateTripRequestCommand request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            if (entity == null) return Task.FromResult<TripRequest>(null);
            entity.PassengerId = request.PassengerId;
            entity.PickupLocation = request.PickupLocation;
            entity.DropoffLocation = request.DropoffLocation;
            entity.RequestedTime = request.PickupTime; // Map PickupTime to RequestedTime
            entity.PassengerCount = request.Passengers; // Map Passengers to PassengerCount
            entity.State = request.Status; // Map Status to State
            entity.Notes = request.Notes;
            _repository.Update(entity);
            return Task.FromResult(entity);
        }
    }
}
