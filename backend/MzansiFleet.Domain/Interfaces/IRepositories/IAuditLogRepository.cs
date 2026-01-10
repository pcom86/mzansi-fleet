using System;
using System.Collections.Generic;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Domain.Interfaces.IRepositories
{
    public interface IAuditLogRepository
    {
        IEnumerable<AuditLog> GetAll();
        AuditLog? GetById(Guid id);
        void Add(AuditLog entity);
        void Update(AuditLog entity);
        void Delete(Guid id);
    }
}

