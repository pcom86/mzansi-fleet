using System.Collections.Generic;
using System.Linq;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Application.Queries;

namespace MzansiFleet.Application.Handlers
{
    public class GetTenantsQueryHandler
    {
        private readonly ITenantRepository _repo;
        public GetTenantsQueryHandler(ITenantRepository repo) { _repo = repo; }
        public IEnumerable<Tenant> Handle(GetTenantsQuery query)
        {
            return _repo.GetAll();
        }
    }
    public class GetUsersQueryHandler
    {
        private readonly IUserRepository _repo;
        public GetUsersQueryHandler(IUserRepository repo) { _repo = repo; }
        public IEnumerable<User> Handle(GetUsersQuery query)
        {
            return _repo.GetAll();
        }
    }
    public class GetOwnerProfilesQueryHandler
    {
        private readonly IOwnerProfileRepository _repo;
        public GetOwnerProfilesQueryHandler(IOwnerProfileRepository repo) { _repo = repo; }
        public IEnumerable<OwnerProfile> Handle(GetOwnerProfilesQuery query)
        {
            return _repo.GetAll();
        }
    }
}
