using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Repository.Repositories
{
    public class StaffProfileRepository : IStaffProfileRepository
    {
        private readonly MzansiFleetDbContext _context;
        public StaffProfileRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<StaffProfile> GetAll() => _context.StaffProfiles.ToList();
        public StaffProfile GetById(Guid id) => _context.StaffProfiles.Find(id);
        public void Add(StaffProfile entity) { _context.StaffProfiles.Add(entity); _context.SaveChanges(); }
        public void Update(StaffProfile entity) { _context.StaffProfiles.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.StaffProfiles.Find(id); if (entity != null) { _context.StaffProfiles.Remove(entity); _context.SaveChanges(); } }
    }
    public class DriverProfileRepository : IDriverProfileRepository
    {
        private readonly MzansiFleetDbContext _context;
        public DriverProfileRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<DriverProfile> GetAll() => _context.DriverProfiles.Include(d => d.User).ToList();
        public DriverProfile GetById(Guid id) => _context.DriverProfiles.Find(id);
        public void Add(DriverProfile entity) { _context.DriverProfiles.Add(entity); _context.SaveChanges(); }
        public void Update(DriverProfile entity) { _context.DriverProfiles.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.DriverProfiles.Find(id); if (entity != null) { _context.DriverProfiles.Remove(entity); _context.SaveChanges(); } }
    }
    public class PassengerProfileRepository : IPassengerProfileRepository
    {
        private readonly MzansiFleetDbContext _context;
        public PassengerProfileRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<PassengerProfile> GetAll() => _context.PassengerProfiles.ToList();
        public PassengerProfile GetById(Guid id) => _context.PassengerProfiles.Find(id);
        public void Add(PassengerProfile entity) { _context.PassengerProfiles.Add(entity); _context.SaveChanges(); }
        public void Update(PassengerProfile entity) { _context.PassengerProfiles.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.PassengerProfiles.Find(id); if (entity != null) { _context.PassengerProfiles.Remove(entity); _context.SaveChanges(); } }
    }
    public class MechanicProfileRepository : IMechanicProfileRepository
    {
        private readonly MzansiFleetDbContext _context;
        public MechanicProfileRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<MechanicProfile> GetAll() => _context.MechanicProfiles.ToList();
        public MechanicProfile GetById(Guid id) => _context.MechanicProfiles.Find(id);
        public void Add(MechanicProfile entity) { _context.MechanicProfiles.Add(entity); _context.SaveChanges(); }
        public void Update(MechanicProfile entity) { _context.MechanicProfiles.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.MechanicProfiles.Find(id); if (entity != null) { _context.MechanicProfiles.Remove(entity); _context.SaveChanges(); } }
    }
    public class ShopProfileRepository : IShopProfileRepository
    {
        private readonly MzansiFleetDbContext _context;
        public ShopProfileRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<ShopProfile> GetAll() => _context.ShopProfiles.ToList();
        public ShopProfile GetById(Guid id) => _context.ShopProfiles.Find(id);
        public void Add(ShopProfile entity) { _context.ShopProfiles.Add(entity); _context.SaveChanges(); }
        public void Update(ShopProfile entity) { _context.ShopProfiles.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.ShopProfiles.Find(id); if (entity != null) { _context.ShopProfiles.Remove(entity); _context.SaveChanges(); } }
    }

    public class ServiceProviderProfileRepository : IServiceProviderProfileRepository
    {
        private readonly MzansiFleetDbContext _context;
        public ServiceProviderProfileRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<ServiceProviderProfile> GetAll() => _context.ServiceProviderProfiles.ToList();
        public ServiceProviderProfile GetById(Guid id) => _context.ServiceProviderProfiles.Find(id);
        public ServiceProviderProfile GetByUserId(Guid userId) => _context.ServiceProviderProfiles.FirstOrDefault(p => p.UserId == userId);
        public void Add(ServiceProviderProfile entity) { _context.ServiceProviderProfiles.Add(entity); _context.SaveChanges(); }
        public void Update(ServiceProviderProfile entity) { _context.ServiceProviderProfiles.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.ServiceProviderProfiles.Find(id); if (entity != null) { _context.ServiceProviderProfiles.Remove(entity); _context.SaveChanges(); } }
        public IEnumerable<ServiceProviderProfile> GetActiveProviders() => _context.ServiceProviderProfiles.Where(sp => sp.IsActive).ToList();
        public IEnumerable<ServiceProviderProfile> GetAvailableProviders() => _context.ServiceProviderProfiles.Where(sp => sp.IsActive && sp.IsAvailable).ToList();
    }

    public class ServiceProviderRepository : IServiceProviderRepository
    {
        private readonly MzansiFleetDbContext _context;
        public ServiceProviderRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<ServiceProvider> GetAll() => _context.ServiceProviders.ToList();
        public ServiceProvider GetById(Guid id) => _context.ServiceProviders.Find(id);
        public void Add(ServiceProvider entity) { _context.ServiceProviders.Add(entity); _context.SaveChanges(); }
        public void Update(ServiceProvider entity) { _context.ServiceProviders.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.ServiceProviders.Find(id); if (entity != null) { _context.ServiceProviders.Remove(entity); _context.SaveChanges(); } }
        public IEnumerable<ServiceProvider> GetActiveProviders() => _context.ServiceProviders.Where(sp => sp.IsActive).ToList();
        public IEnumerable<ServiceProvider> GetProvidersByServiceType(string serviceType) => 
            _context.ServiceProviders.Where(sp => sp.IsActive && sp.ServiceTypes.Contains(serviceType)).ToList();
    }
}

