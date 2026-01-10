using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Commands
{
    public class CreateVehicleCommand : IRequest<Vehicle>
    {
        public Guid OwnerId { get; set; }
        public string Make { get; set; }
        public string Model { get; set; }
        public string RegistrationNumber { get; set; }
        public int Year { get; set; }
        public string Color { get; set; }
        public string State { get; set; }
    }
}
