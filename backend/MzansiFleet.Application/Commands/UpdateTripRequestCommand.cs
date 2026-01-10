using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Commands
{
    public class UpdateTripRequestCommand : IRequest<TripRequest>
    {
        public Guid Id { get; set; }
        public Guid PassengerId { get; set; }
        public string PickupLocation { get; set; }
        public string DropoffLocation { get; set; }
        public DateTime PickupTime { get; set; }
        public int Passengers { get; set; }
        public string Status { get; set; }
        public string Notes { get; set; }
    }
}

