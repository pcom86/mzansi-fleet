using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Queries
{
    public class GetVehicleByIdQuery : IRequest<Vehicle>
    {
        public Guid Id { get; set; }
    }
}

