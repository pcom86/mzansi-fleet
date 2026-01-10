using System;
using System.Collections.Generic;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Domain.Interfaces.IRepositories
{
    public interface IVehicleDocumentRepository
    {
        IEnumerable<VehicleDocument> GetAll();
        VehicleDocument? GetById(Guid id);
        void Add(VehicleDocument entity);
        void Update(VehicleDocument entity);
        void Delete(Guid id);
    }
    public interface IMaintenanceEventRepository
    {
        IEnumerable<MaintenanceEvent> GetAll();
        MaintenanceEvent? GetById(Guid id);
        void Add(MaintenanceEvent entity);
        void Update(MaintenanceEvent entity);
        void Delete(Guid id);
    }
    public interface IServiceRuleRepository
    {
        IEnumerable<ServiceRule> GetAll();
        ServiceRule? GetById(Guid id);
        void Add(ServiceRule entity);
        void Update(ServiceRule entity);
        void Delete(Guid id);
    }
    public interface IPartRuleRepository
    {
        IEnumerable<PartRule> GetAll();
        PartRule? GetById(Guid id);
        void Add(PartRule entity);
        void Update(PartRule entity);
        void Delete(Guid id);
    }
}

