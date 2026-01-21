using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Repository;

namespace MzansiFleet.Repository.Repositories
{
    public class RoadsideAssistanceRepository : IRoadsideAssistanceRepository
    {
        private readonly MzansiFleetDbContext _context;

        public RoadsideAssistanceRepository(MzansiFleetDbContext context)
        {
            _context = context;
        }

        public async Task<RoadsideAssistanceRequest> CreateAsync(RoadsideAssistanceRequest request)
        {
            _context.RoadsideAssistanceRequests.Add(request);
            await _context.SaveChangesAsync();
            return request;
        }

        public async Task<RoadsideAssistanceRequest?> GetByIdAsync(Guid id)
        {
            return await _context.RoadsideAssistanceRequests
                .Include(r => r.Vehicle)
                .Include(r => r.ServiceProvider)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<IEnumerable<RoadsideAssistanceRequest>> GetByUserIdAsync(Guid userId)
        {
            return await _context.RoadsideAssistanceRequests
                .Include(r => r.Vehicle)
                .Include(r => r.ServiceProvider)
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.RequestedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<RoadsideAssistanceRequest>> GetPendingRequestsAsync()
        {
            return await _context.RoadsideAssistanceRequests
                .Include(r => r.Vehicle)
                .Where(r => r.Status == "Pending")
                .OrderByDescending(r => r.Priority == "Emergency")
                .ThenByDescending(r => r.Priority == "High")
                .ThenBy(r => r.RequestedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<RoadsideAssistanceRequest>> GetByServiceProviderIdAsync(Guid serviceProviderId)
        {
            return await _context.RoadsideAssistanceRequests
                .Include(r => r.Vehicle)
                .Where(r => r.ServiceProviderId == serviceProviderId)
                .OrderByDescending(r => r.RequestedAt)
                .ToListAsync();
        }

        public async Task<RoadsideAssistanceRequest> UpdateAsync(RoadsideAssistanceRequest request)
        {
            _context.RoadsideAssistanceRequests.Update(request);
            await _context.SaveChangesAsync();
            return request;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var request = await _context.RoadsideAssistanceRequests.FindAsync(id);
            if (request == null) return false;

            _context.RoadsideAssistanceRequests.Remove(request);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
