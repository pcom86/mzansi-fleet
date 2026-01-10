using System.Collections.Generic;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Queries
{
    public class GetAllTripRequestsQuery : IRequest<IEnumerable<TripRequest>>
    {
    }
}

