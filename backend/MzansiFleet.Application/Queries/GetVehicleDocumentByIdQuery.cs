using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Queries
{
    public class GetVehicleDocumentByIdQuery : IRequest<VehicleDocument>
    {
        public Guid Id { get; set; }
    }
}

