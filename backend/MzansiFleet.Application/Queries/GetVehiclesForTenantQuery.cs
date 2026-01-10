using System;
using System.Collections.Generic;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Queries
{
    public class GetVehiclesForTenantQuery : IRequest<IEnumerable<Vehicle>>
    {
        public Guid TenantId { get; set; }
    }
}

