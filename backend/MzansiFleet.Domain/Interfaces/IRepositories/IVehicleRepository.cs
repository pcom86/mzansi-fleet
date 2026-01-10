﻿using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Domain.Interfaces.IRepositories
{
    public interface IVehicleRepository
    {
        IEnumerable<Vehicle> GetByTenantId(Guid tenantId);
        void Add(Vehicle vehicle);
        IEnumerable<Vehicle> GetAll();
        Task<IEnumerable<Vehicle>> GetAllAsync();
        void Delete(Guid id);
        Vehicle? GetById(Guid id);
        Task<Vehicle?> GetByIdAsync(Guid id);
        void Update(Vehicle vehicle);
        Task<Vehicle?> UpdateAsync(Vehicle vehicle);
    }
}
