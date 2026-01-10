using System;
using System.Collections.Generic;
using System.Linq;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Repository.Repositories
{
    public class TenantRepository : ITenantRepository
    {
        private readonly MzansiFleetDbContext _context;
        public TenantRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<Tenant> GetAll() => _context.Tenants.ToList();
        public Tenant GetById(Guid id) => _context.Tenants.Find(id);
        public void Add(Tenant entity) { _context.Tenants.Add(entity); _context.SaveChanges(); }
        public void Update(Tenant entity) { _context.Tenants.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.Tenants.Find(id); if (entity != null) { _context.Tenants.Remove(entity); _context.SaveChanges(); } }
    }
    public class UserRepository : IUserRepository
    {
        private readonly MzansiFleetDbContext _context;
        public UserRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<User> GetAll() => _context.Users.ToList();
        public User GetById(Guid id) => _context.Users.Find(id);
        public void Add(User entity) { _context.Users.Add(entity); _context.SaveChanges(); }
        public void Update(User entity) { _context.Users.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.Users.Find(id); if (entity != null) { _context.Users.Remove(entity); _context.SaveChanges(); } }
    }
    public class OwnerProfileRepository : IOwnerProfileRepository
    {
        private readonly MzansiFleetDbContext _context;
        public OwnerProfileRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<OwnerProfile> GetAll() => _context.OwnerProfiles.ToList();
        public OwnerProfile GetById(Guid id) => _context.OwnerProfiles.Find(id);
        public void Add(OwnerProfile entity) { _context.OwnerProfiles.Add(entity); _context.SaveChanges(); }
        public void Update(OwnerProfile entity) { _context.OwnerProfiles.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.OwnerProfiles.Find(id); if (entity != null) { _context.OwnerProfiles.Remove(entity); _context.SaveChanges(); } }
    }
}

