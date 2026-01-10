using System;
using System.Collections.Generic;
using System.Linq;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Repository.Repositories
{
    public class AuditLogRepository : IAuditLogRepository
    {
        private readonly MzansiFleetDbContext _context;
        public AuditLogRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<AuditLog> GetAll() => _context.AuditLogs.ToList();
        public AuditLog GetById(Guid id) => _context.AuditLogs.Find(id);
        public void Add(AuditLog entity) { _context.AuditLogs.Add(entity); _context.SaveChanges(); }
        public void Update(AuditLog entity) { _context.AuditLogs.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.AuditLogs.Find(id); if (entity != null) { _context.AuditLogs.Remove(entity); _context.SaveChanges(); } }
    }
}

