using System.Collections.Generic;
using System.Linq;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Application.Queries;

namespace MzansiFleet.Application.Handlers
{
    public class GetDriversQueryHandler
    {
        private readonly IDriverProfileRepository _repo;
        public GetDriversQueryHandler(IDriverProfileRepository repo) { _repo = repo; }
        public IEnumerable<DriverProfile> Handle(GetDriversQuery query)
        {
            return _repo.GetAll();
        }
    }
    public class GetDriverByIdQueryHandler
    {
        private readonly IDriverProfileRepository _repo;
        public GetDriverByIdQueryHandler(IDriverProfileRepository repo) { _repo = repo; }
        public DriverProfile Handle(GetDriverByIdQuery query)
        {
            return _repo.GetById(query.Id);
        }
    }
}

