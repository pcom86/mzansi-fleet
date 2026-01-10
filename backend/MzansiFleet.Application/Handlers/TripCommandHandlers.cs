using System.Collections.Generic;
using System.Linq;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Application.Commands;

namespace MzansiFleet.Application.Handlers
{
    public class CreateTripCommandHandler
    {
        private readonly ITripRequestRepository _repo;
        public CreateTripCommandHandler(ITripRequestRepository repo) { _repo = repo; }
        public TripRequest Handle(CreateTripCommand command)
        {
            var trip = new TripRequest
            {
                Id = System.Guid.NewGuid(),
                PassengerId = command.PassengerId,
                TenantId = command.TenantId,
                PickupLocation = command.PickupLocation,
                DropoffLocation = command.DropoffLocation,
                RequestedTime = command.RequestedTime,
                PassengerCount = command.PassengerCount,
                Notes = command.Notes,
                IsPooling = command.IsPooling,
                State = command.State
            };
            _repo.Add(trip);
            return trip;
        }
    }
    public class UpdateTripCommandHandler
    {
        private readonly ITripRequestRepository _repo;
        public UpdateTripCommandHandler(ITripRequestRepository repo) { _repo = repo; }
        public void Handle(UpdateTripCommand command)
        {
            var trip = new TripRequest
            {
                Id = command.Id,
                PassengerId = command.PassengerId,
                TenantId = command.TenantId,
                PickupLocation = command.PickupLocation,
                DropoffLocation = command.DropoffLocation,
                RequestedTime = command.RequestedTime,
                PassengerCount = command.PassengerCount,
                Notes = command.Notes,
                IsPooling = command.IsPooling,
                State = command.State
            };
            _repo.Update(trip);
        }
    }
    public class DeleteTripCommandHandler
    {
        private readonly ITripRequestRepository _repo;
        public DeleteTripCommandHandler(ITripRequestRepository repo) { _repo = repo; }
        public void Handle(DeleteTripCommand command)
        {
            _repo.Delete(command.Id);
        }
    }
}

