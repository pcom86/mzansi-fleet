using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Domain.Interfaces.IRepositories
{
    public interface IServiceHistoryRepository
    {
        Task<ServiceHistory?> GetByIdAsync(Guid id);
        Task<IEnumerable<ServiceHistory>> GetAllAsync();
        Task<IEnumerable<ServiceHistory>> GetByVehicleIdAsync(Guid vehicleId);
        Task<ServiceHistory> AddAsync(ServiceHistory serviceHistory);
        Task<ServiceHistory> UpdateAsync(ServiceHistory serviceHistory);
        Task DeleteAsync(Guid id);
        Task<ServiceHistory?> GetLatestServiceByVehicleIdAsync(Guid vehicleId);
    }
}
