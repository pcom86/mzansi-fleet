using System.Collections.Generic;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Application.Queries;

namespace MzansiFleet.Application.Handlers
{
    public class GetVehiclesForTenantQueryHandler
    {
        private readonly IVehicleRepository _repo;
        public GetVehiclesForTenantQueryHandler(IVehicleRepository repo)
        {
            _repo = repo;
        }
        public IEnumerable<Vehicle> Handle(GetVehiclesForTenantQuery query)
        {
            return _repo.GetByTenantId(query.TenantId);
        }
    }
}
