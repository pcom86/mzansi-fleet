using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Repository.Repositories
{
    public class MaintenanceHistoryRepository : IMaintenanceHistoryRepository
    {
        private readonly MzansiFleetDbContext _context;

        public MaintenanceHistoryRepository(MzansiFleetDbContext context)
        {
            _context = context;
        }

        public async Task<MaintenanceHistory?> GetByIdAsync(Guid id)
        {
            return await _context.MaintenanceHistories.FindAsync(id);
        }

        public async Task<IEnumerable<MaintenanceHistory>> GetAllAsync()
        {
            return await _context.MaintenanceHistories.ToListAsync();
        }

        public async Task<IEnumerable<MaintenanceHistory>> GetByVehicleIdAsync(Guid vehicleId)
        {
            return await _context.MaintenanceHistories
                .Where(m => m.VehicleId == vehicleId)
                .OrderByDescending(m => m.MaintenanceDate)
                .ToListAsync();
        }

        public async Task<MaintenanceHistory> AddAsync(MaintenanceHistory maintenanceHistory)
        {
            maintenanceHistory.CreatedAt = DateTime.UtcNow;
            _context.MaintenanceHistories.Add(maintenanceHistory);
            await _context.SaveChangesAsync();
            return maintenanceHistory;
        }

        public async Task<MaintenanceHistory> UpdateAsync(MaintenanceHistory maintenanceHistory)
        {
            maintenanceHistory.UpdatedAt = DateTime.UtcNow;
            _context.MaintenanceHistories.Update(maintenanceHistory);
            await _context.SaveChangesAsync();
            return maintenanceHistory;
        }

        public async Task DeleteAsync(Guid id)
        {
            var maintenanceHistory = await _context.MaintenanceHistories.FindAsync(id);
            if (maintenanceHistory != null)
            {
                _context.MaintenanceHistories.Remove(maintenanceHistory);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<MaintenanceHistory?> GetLatestMaintenanceByVehicleIdAsync(Guid vehicleId)
        {
            return await _context.MaintenanceHistories
                .Where(m => m.VehicleId == vehicleId)
                .OrderByDescending(m => m.MaintenanceDate)
                .FirstOrDefaultAsync();
        }
    }
}
