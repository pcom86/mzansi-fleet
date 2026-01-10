using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Domain.Interfaces.IRepositories
{
    public interface IMaintenanceHistoryRepository
    {
        Task<MaintenanceHistory?> GetByIdAsync(Guid id);
        Task<IEnumerable<MaintenanceHistory>> GetAllAsync();
        Task<IEnumerable<MaintenanceHistory>> GetByVehicleIdAsync(Guid vehicleId);
        Task<MaintenanceHistory> AddAsync(MaintenanceHistory maintenanceHistory);
        Task<MaintenanceHistory> UpdateAsync(MaintenanceHistory maintenanceHistory);
        Task DeleteAsync(Guid id);
        Task<MaintenanceHistory?> GetLatestMaintenanceByVehicleIdAsync(Guid vehicleId);
    }
}
