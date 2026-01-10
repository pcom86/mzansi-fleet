using System;
using System.Collections.Generic;
using System.Linq;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Repository.Repositories
{
    public class VehicleDocumentRepository : IVehicleDocumentRepository
    {
        private readonly MzansiFleetDbContext _context;
        public VehicleDocumentRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<VehicleDocument> GetAll() => _context.VehicleDocuments.ToList();
        public VehicleDocument GetById(Guid id) => _context.VehicleDocuments.Find(id);
        public void Add(VehicleDocument entity) { _context.VehicleDocuments.Add(entity); _context.SaveChanges(); }
        public void Update(VehicleDocument entity) { _context.VehicleDocuments.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.VehicleDocuments.Find(id); if (entity != null) { _context.VehicleDocuments.Remove(entity); _context.SaveChanges(); } }
    }
    public class MaintenanceEventRepository : IMaintenanceEventRepository
    {
        private readonly MzansiFleetDbContext _context;
        public MaintenanceEventRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<MaintenanceEvent> GetAll() => _context.MaintenanceEvents.ToList();
        public MaintenanceEvent GetById(Guid id) => _context.MaintenanceEvents.Find(id);
        public void Add(MaintenanceEvent entity) { _context.MaintenanceEvents.Add(entity); _context.SaveChanges(); }
        public void Update(MaintenanceEvent entity) { _context.MaintenanceEvents.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.MaintenanceEvents.Find(id); if (entity != null) { _context.MaintenanceEvents.Remove(entity); _context.SaveChanges(); } }
    }
    public class ServiceRuleRepository : IServiceRuleRepository
    {
        private readonly MzansiFleetDbContext _context;
        public ServiceRuleRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<ServiceRule> GetAll() => _context.ServiceRules.ToList();
        public ServiceRule GetById(Guid id) => _context.ServiceRules.Find(id);
        public void Add(ServiceRule entity) { _context.ServiceRules.Add(entity); _context.SaveChanges(); }
        public void Update(ServiceRule entity) { _context.ServiceRules.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.ServiceRules.Find(id); if (entity != null) { _context.ServiceRules.Remove(entity); _context.SaveChanges(); } }
    }
    public class PartRuleRepository : IPartRuleRepository
    {
        private readonly MzansiFleetDbContext _context;
        public PartRuleRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<PartRule> GetAll() => _context.PartRules.ToList();
        public PartRule GetById(Guid id) => _context.PartRules.Find(id);
        public void Add(PartRule entity) { _context.PartRules.Add(entity); _context.SaveChanges(); }
        public void Update(PartRule entity) { _context.PartRules.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.PartRules.Find(id); if (entity != null) { _context.PartRules.Remove(entity); _context.SaveChanges(); } }
    }
}

