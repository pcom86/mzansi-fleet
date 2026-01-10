using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Repository.Repositories
{
    public class VehicleRepository : IVehicleRepository
    {
        private readonly MzansiFleetDbContext _context;
        public VehicleRepository(MzansiFleetDbContext context)
        {
            _context = context;
        }
        public IEnumerable<Vehicle> GetByTenantId(Guid tenantId)
        {
            return _context.Vehicles.Where(v => v.TenantId == tenantId).ToList();
        }
        public void Add(Vehicle vehicle)
        {
            _context.Vehicles.Add(vehicle);
            _context.SaveChanges();
        }
        public IEnumerable<Vehicle> GetAll()
        {
            return _context.Vehicles.AsNoTracking().ToList();
        }
        public async Task<IEnumerable<Vehicle>> GetAllAsync()
        {
            return await _context.Vehicles.ToListAsync();
        }
        public void Delete(Guid id)
        {
            var vehicle = _context.Vehicles.FirstOrDefault(v => v.Id == id);
            if (vehicle != null)
            {
                _context.Vehicles.Remove(vehicle);
                _context.SaveChanges();
            }
        }
        public Vehicle GetById(Guid id)
        {
            return _context.Vehicles.FirstOrDefault(v => v.Id == id);
        }
        public async Task<Vehicle?> GetByIdAsync(Guid id)
        {
            return await _context.Vehicles.FirstOrDefaultAsync(v => v.Id == id);
        }
        public void Update(Vehicle vehicle)
        {
            // Detach any existing tracked entity with the same ID
            var existingEntry = _context.ChangeTracker.Entries<Vehicle>()
                .FirstOrDefault(e => e.Entity.Id == vehicle.Id);
            
            if (existingEntry != null)
            {
                existingEntry.State = EntityState.Detached;
            }
            
            _context.Vehicles.Update(vehicle);
            _context.SaveChanges();
        }
        public async Task<Vehicle?> UpdateAsync(Vehicle vehicle)
        {
            _context.Vehicles.Update(vehicle);
            await _context.SaveChangesAsync();
            return vehicle;
        }
    }
}
