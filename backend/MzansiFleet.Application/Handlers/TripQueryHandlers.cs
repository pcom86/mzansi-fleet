using System.Collections.Generic;
using System.Linq;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Application.Queries;

namespace MzansiFleet.Application.Handlers
{
    public class GetTripsQueryHandler
    {
        private readonly ITripRequestRepository _repo;
        public GetTripsQueryHandler(ITripRequestRepository repo) { _repo = repo; }
        public IEnumerable<TripRequest> Handle(GetTripsQuery query)
        {
            return _repo.GetAll();
        }
    }
    public class GetTripByIdQueryHandler
    {
        private readonly ITripRequestRepository _repo;
        public GetTripByIdQueryHandler(ITripRequestRepository repo) { _repo = repo; }
        public TripRequest Handle(GetTripByIdQuery query)
        {
            return _repo.GetById(query.Id);
        }
    }
}

