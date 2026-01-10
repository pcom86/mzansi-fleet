using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Repository.Repositories
{
    public class ServiceHistoryRepository : IServiceHistoryRepository
    {
        private readonly MzansiFleetDbContext _context;

        public ServiceHistoryRepository(MzansiFleetDbContext context)
        {
            _context = context;
        }

        public async Task<ServiceHistory?> GetByIdAsync(Guid id)
        {
            return await _context.ServiceHistories.FindAsync(id);
        }

        public async Task<IEnumerable<ServiceHistory>> GetAllAsync()
        {
            return await _context.ServiceHistories.ToListAsync();
        }

        public async Task<IEnumerable<ServiceHistory>> GetByVehicleIdAsync(Guid vehicleId)
        {
            return await _context.ServiceHistories
                .Where(s => s.VehicleId == vehicleId)
                .OrderByDescending(s => s.ServiceDate)
                .ToListAsync();
        }

        public async Task<ServiceHistory> AddAsync(ServiceHistory serviceHistory)
        {
            serviceHistory.CreatedAt = DateTime.UtcNow;
            _context.ServiceHistories.Add(serviceHistory);
            await _context.SaveChangesAsync();
            return serviceHistory;
        }

        public async Task<ServiceHistory> UpdateAsync(ServiceHistory serviceHistory)
        {
            serviceHistory.UpdatedAt = DateTime.UtcNow;
            _context.ServiceHistories.Update(serviceHistory);
            await _context.SaveChangesAsync();
            return serviceHistory;
        }

        public async Task DeleteAsync(Guid id)
        {
            var serviceHistory = await _context.ServiceHistories.FindAsync(id);
            if (serviceHistory != null)
            {
                _context.ServiceHistories.Remove(serviceHistory);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<ServiceHistory?> GetLatestServiceByVehicleIdAsync(Guid vehicleId)
        {
            return await _context.ServiceHistories
                .Where(s => s.VehicleId == vehicleId)
                .OrderByDescending(s => s.ServiceDate)
                .FirstOrDefaultAsync();
        }
    }
}
