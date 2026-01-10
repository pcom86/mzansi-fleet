using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Queries
{
    public class GetTripRequestByIdQuery : IRequest<TripRequest>
    {
        public Guid Id { get; set; }
    }
}

