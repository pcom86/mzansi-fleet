using System;
using System.Collections.Generic;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Queries
{
    public class GetVehicleDocumentsByVehicleIdQuery : IRequest<IEnumerable<VehicleDocument>>
    {
        public Guid VehicleId { get; set; }
    }
}
