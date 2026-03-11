using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Repository.Repositories
{
    public class TaxiRankRepository : ITaxiRankRepository
    {
        private readonly MzansiFleetDbContext _context;

        public TaxiRankRepository(MzansiFleetDbContext context)
        {
            _context = context;
        }

        public async Task<TaxiRank?> GetByIdAsync(Guid id)
        {
            return await _context.TaxiRanks
                .Include(r => r.Tenant)
                .Include(r => r.Marshals)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<IEnumerable<TaxiRank>> GetAllAsync()
        {
            return await _context.TaxiRanks
                .Include(r => r.Tenant)
                .OrderBy(r => r.Name)
                .ToListAsync();
        }

        public async Task<IEnumerable<TaxiRank>> GetByTenantIdAsync(Guid tenantId)
        {
            // Get ranks associated with this tenant through the many-to-many relationship
            return await _context.TaxiRankAssociations
                .Where(tra => tra.TenantId == tenantId)
                .Include(tra => tra.TaxiRank)
                .ThenInclude(r => r.Tenant)
                .Select(tra => tra.TaxiRank)
                .OrderBy(r => r.Name)
                .ToListAsync();
        }

        public async Task<TaxiRank?> GetByCodeAsync(string code)
        {
            return await _context.TaxiRanks
                .FirstOrDefaultAsync(r => r.Code == code);
        }

        public async Task<TaxiRank> AddAsync(TaxiRank rank)
        {
            _context.TaxiRanks.Add(rank);
            await _context.SaveChangesAsync();
            return rank;
        }

        public async Task<TaxiRank> UpdateAsync(TaxiRank rank)
        {
            rank.UpdatedAt = DateTime.UtcNow;
            _context.TaxiRanks.Update(rank);
            await _context.SaveChangesAsync();
            return rank;
        }

        public async Task DeleteAsync(Guid id)
        {
            var rank = await _context.TaxiRanks.FindAsync(id);
            if (rank != null)
            {
                _context.TaxiRanks.Remove(rank);
                await _context.SaveChangesAsync();
            }
        }
        
        // Association management methods
        public async Task AddAssociationAsync(Guid taxiRankId, Guid tenantId, bool isPrimary = false)
        {
            // If isPrimary, mark all other associations as not primary
            if (isPrimary)
            {
                var existingAssociations = await _context.TaxiRankAssociations
                    .Where(tra => tra.TaxiRankId == taxiRankId && tra.IsPrimary)
                    .ToListAsync();
                    
                foreach (var assoc in existingAssociations)
                {
                    assoc.IsPrimary = false;
                }
            }
            
            var association = new TaxiRankAssociation
            {
                Id = Guid.NewGuid(),
                TaxiRankId = taxiRankId,
                TenantId = tenantId,
                IsPrimary = isPrimary,
                AssignedAt = DateTime.UtcNow
            };
            
            _context.TaxiRankAssociations.Add(association);
            await _context.SaveChangesAsync();
        }
        
        public async Task RemoveAssociationAsync(Guid taxiRankId, Guid tenantId)
        {
            var association = await _context.TaxiRankAssociations
                .FirstOrDefaultAsync(tra => tra.TaxiRankId == taxiRankId && tra.TenantId == tenantId);
                
            if (association != null)
            {
                _context.TaxiRankAssociations.Remove(association);
                await _context.SaveChangesAsync();
            }
        }
        
        public async Task<IEnumerable<TaxiRankAssociation>> GetAssociationsAsync(Guid taxiRankId)
        {
            return await _context.TaxiRankAssociations
                .Where(tra => tra.TaxiRankId == taxiRankId)
                .Include(tra => tra.Tenant)
                .OrderByDescending(tra => tra.IsPrimary)
                .ThenBy(tra => tra.Tenant.Name)
                .ToListAsync();
        }
    }

    public class TaxiRankAdminRepository : ITaxiRankAdminRepository
    {
        private readonly MzansiFleetDbContext _context;

        public TaxiRankAdminRepository(MzansiFleetDbContext context)
        {
            _context = context;
        }

        public async Task<TaxiRankAdminProfile?> GetByIdAsync(Guid id)
        {
            return await _context.TaxiRankAdmins
                .Include(a => a.User)
                .Include(a => a.Tenant)
                .Include(a => a.TaxiRank)
                .FirstOrDefaultAsync(a => a.Id == id);
        }

        public async Task<IEnumerable<TaxiRankAdminProfile>> GetAllAsync()
        {
            return await _context.TaxiRankAdmins
                .Include(a => a.User)
                .Include(a => a.Tenant)
                .Include(a => a.TaxiRank)
                .OrderBy(a => a.FullName)
                .ToListAsync();
        }

        public async Task<IEnumerable<TaxiRankAdminProfile>> GetByTenantIdAsync(Guid tenantId)
        {
            return await _context.TaxiRankAdmins
                .Where(a => a.TenantId == tenantId)
                .Include(a => a.TaxiRank)
                .OrderBy(a => a.FullName)
                .ToListAsync();
        }

        public async Task<TaxiRankAdminProfile?> GetByUserIdAsync(Guid userId)
        {
            return await _context.TaxiRankAdmins
                .Include(a => a.TaxiRank)
                .FirstOrDefaultAsync(a => a.UserId == userId);
        }

        public async Task<IEnumerable<TaxiRankAdminProfile>> GetByTaxiRankIdAsync(Guid taxiRankId)
        {
            return await _context.TaxiRankAdmins
                .Where(a => a.TaxiRankId == taxiRankId)
                .Include(a => a.User)
                .OrderBy(a => a.FullName)
                .ToListAsync();
        }

        public async Task<TaxiRankAdminProfile?> GetByAdminCodeAsync(string adminCode)
        {
            return await _context.TaxiRankAdmins
                .FirstOrDefaultAsync(a => a.AdminCode == adminCode);
        }

        public async Task<TaxiRankAdminProfile> AddAsync(TaxiRankAdminProfile admin)
        {
            _context.TaxiRankAdmins.Add(admin);
            await _context.SaveChangesAsync();
            return admin;
        }

        public async Task<TaxiRankAdminProfile> UpdateAsync(TaxiRankAdminProfile admin)
        {
            admin.UpdatedAt = DateTime.UtcNow;
            _context.TaxiRankAdmins.Update(admin);
            await _context.SaveChangesAsync();
            return admin;
        }

        public async Task DeleteAsync(Guid id)
        {
            var admin = await _context.TaxiRankAdmins.FindAsync(id);
            if (admin != null)
            {
                _context.TaxiRankAdmins.Remove(admin);
                await _context.SaveChangesAsync();
            }
        }
    }

    public class VehicleTaxiRankRepository : IVehicleTaxiRankRepository
    {
        private readonly MzansiFleetDbContext _context;

        public VehicleTaxiRankRepository(MzansiFleetDbContext context)
        {
            _context = context;
        }

        public async Task<VehicleTaxiRank?> GetByIdAsync(Guid id)
        {
            return await _context.VehicleTaxiRanks
                .Include(vr => vr.Vehicle)
                .Include(vr => vr.TaxiRank)
                .FirstOrDefaultAsync(vr => vr.Id == id);
        }

        public async Task<IEnumerable<VehicleTaxiRank>> GetByTaxiRankIdAsync(Guid taxiRankId)
        {
            return await _context.VehicleTaxiRanks
                .Where(vr => vr.TaxiRankId == taxiRankId && vr.IsActive)
                .Include(vr => vr.Vehicle)
                .OrderByDescending(vr => vr.AssignedDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<VehicleTaxiRank>> GetByVehicleIdAsync(Guid vehicleId)
        {
            return await _context.VehicleTaxiRanks
                .Where(vr => vr.VehicleId == vehicleId)
                .Include(vr => vr.TaxiRank)
                .OrderByDescending(vr => vr.AssignedDate)
                .ToListAsync();
        }

        public async Task<VehicleTaxiRank?> GetActiveByVehicleIdAsync(Guid vehicleId)
        {
            return await _context.VehicleTaxiRanks
                .Include(vr => vr.TaxiRank)
                .FirstOrDefaultAsync(vr => vr.VehicleId == vehicleId && vr.IsActive);
        }

        public async Task<VehicleTaxiRank> AddAsync(VehicleTaxiRank assignment)
        {
            _context.VehicleTaxiRanks.Add(assignment);
            await _context.SaveChangesAsync();
            return assignment;
        }

        public async Task<VehicleTaxiRank> UpdateAsync(VehicleTaxiRank assignment)
        {
            _context.VehicleTaxiRanks.Update(assignment);
            await _context.SaveChangesAsync();
            return assignment;
        }

        public async Task DeleteAsync(Guid id)
        {
            var assignment = await _context.VehicleTaxiRanks.FindAsync(id);
            if (assignment != null)
            {
                _context.VehicleTaxiRanks.Remove(assignment);
                await _context.SaveChangesAsync();
            }
        }
    }

    public class RouteRepository : IRouteRepository
    {
        private readonly MzansiFleetDbContext _context;

        public RouteRepository(MzansiFleetDbContext context)
        {
            _context = context;
        }

        public async Task<Route?> GetByIdAsync(Guid id)
        {
            return await _context.Routes
                .Include(s => s.TaxiRank)
                .FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task<IEnumerable<Route>> GetAllAsync()
        {
            return await _context.Routes
                .Include(s => s.TaxiRank)
                .OrderBy(s => s.RouteName)
                .ToListAsync();
        }

        public async Task<IEnumerable<Route>> GetByTaxiRankIdAsync(Guid taxiRankId)
        {
            return await _context.Routes
                .Where(s => s.TaxiRankId == taxiRankId)
                .OrderBy(s => s.DepartureTime)
                .ToListAsync();
        }

        public async Task<IEnumerable<Route>> GetByTenantIdAsync(Guid tenantId)
        {
            return await _context.Routes
                .Where(s => s.TenantId == tenantId)
                .Include(s => s.TaxiRank)
                .OrderBy(s => s.RouteName)
                .ToListAsync();
        }

        public async Task<IEnumerable<Route>> GetActiveByTaxiRankIdAsync(Guid taxiRankId)
        {
            return await _context.Routes
                .Where(s => s.TaxiRankId == taxiRankId && s.IsActive)
                .OrderBy(s => s.DepartureTime)
                .ToListAsync();
        }

        public async Task<Route> AddAsync(Route route)
        {
            _context.Routes.Add(route);
            await _context.SaveChangesAsync();
            return route;
        }

        public async Task<Route> UpdateAsync(Route route)
        {
            route.UpdatedAt = DateTime.UtcNow;
            _context.Routes.Update(route);
            await _context.SaveChangesAsync();
            return route;
        }

        public async Task DeleteAsync(Guid id)
        {
            var route = await _context.Routes.FindAsync(id);
            if (route != null)
            {
                _context.Routes.Remove(route);
                await _context.SaveChangesAsync();
            }
        }
    }

    public class TaxiRankTripRepository : ITaxiRankTripRepository
    {
        private readonly MzansiFleetDbContext _context;

        public TaxiRankTripRepository(MzansiFleetDbContext context)
        {
            _context = context;
        }

        public async Task<TaxiRankTrip?> GetByIdAsync(Guid id)
        {
            return await _context.TaxiRankTrips
                .Include(t => t.Vehicle)
                .Include(t => t.Driver)
                .Include(t => t.Marshal)
                .Include(t => t.TaxiRank)
                .Include(t => t.Passengers)
                .Include(t => t.Costs)
                .FirstOrDefaultAsync(t => t.Id == id);
        }

        public async Task<IEnumerable<TaxiRankTrip>> GetAllAsync()
        {
            return await _context.TaxiRankTrips
                .Include(t => t.Vehicle)
                .Include(t => t.Driver)
                .Include(t => t.Marshal)
                .Include(t => t.TaxiRank)
                .Include(t => t.Passengers)
                .Include(t => t.Costs)
                .OrderByDescending(t => t.DepartureTime)
                .ToListAsync();
        }

        public async Task<IEnumerable<TaxiRankTrip>> GetByTenantIdAsync(Guid tenantId)
        {
            return await _context.TaxiRankTrips
                .Include(t => t.Vehicle)
                .Include(t => t.Driver)
                .Include(t => t.Marshal)
                .Include(t => t.TaxiRank)
                .Include(t => t.Passengers)
                .Include(t => t.Costs)
                .Where(t => t.TenantId == tenantId)
                .OrderByDescending(t => t.DepartureTime)
                .ToListAsync();
        }

        public async Task<IEnumerable<TaxiRankTrip>> GetByVehicleIdAsync(Guid vehicleId)
        {
            return await _context.TaxiRankTrips
                .Include(t => t.Driver)
                .Include(t => t.Marshal)
                .Include(t => t.TaxiRank)
                .Include(t => t.Passengers)
                .Include(t => t.Costs)
                .Where(t => t.VehicleId == vehicleId)
                .OrderByDescending(t => t.DepartureTime)
                .ToListAsync();
        }

        public async Task<IEnumerable<TaxiRankTrip>> GetByDriverIdAsync(Guid driverId)
        {
            return await _context.TaxiRankTrips
                .Include(t => t.Vehicle)
                .Include(t => t.Marshal)
                .Include(t => t.Passengers)
                .Include(t => t.Costs)
                .Where(t => t.DriverId == driverId)
                .OrderByDescending(t => t.DepartureTime)
                .ToListAsync();
        }

        public async Task<IEnumerable<TaxiRankTrip>> GetByMarshalIdAsync(Guid marshalId)
        {
            return await _context.TaxiRankTrips
                .Include(t => t.Vehicle)
                .Include(t => t.Driver)
                .Include(t => t.TaxiRank)
                .Include(t => t.Passengers)
                .Include(t => t.Costs)
                .Where(t => t.MarshalId == marshalId)
                .OrderByDescending(t => t.DepartureTime)
                .ToListAsync();
        }

        public async Task<IEnumerable<TaxiRankTrip>> GetByTaxiRankIdAsync(Guid taxiRankId)
        {
            return await _context.TaxiRankTrips
                .Include(t => t.Vehicle)
                .Include(t => t.Driver)
                .Include(t => t.Marshal)
                .Include(t => t.Passengers)
                .Include(t => t.Costs)
                .Where(t => t.TaxiRankId == taxiRankId)
                .OrderByDescending(t => t.DepartureTime)
                .ToListAsync();
        }

        public async Task<IEnumerable<TaxiRankTrip>> GetByDateRangeAsync(DateTime startDate, DateTime endDate, Guid? tenantId = null)
        {
            var query = _context.TaxiRankTrips
                .Include(t => t.Vehicle)
                .Include(t => t.Driver)
                .Include(t => t.TaxiRank)
                .Include(t => t.Passengers)
                .Include(t => t.Costs)
                .Where(t => t.DepartureTime >= startDate && t.DepartureTime <= endDate);

            if (tenantId.HasValue)
            {
                query = query.Where(t => t.TenantId == tenantId.Value);
            }

            return await query.OrderByDescending(t => t.DepartureTime).ToListAsync();
        }

        public async Task<TaxiRankTrip> AddAsync(TaxiRankTrip trip)
        {
            _context.TaxiRankTrips.Add(trip);
            await _context.SaveChangesAsync();
            return trip;
        }

        public async Task UpdateAsync(TaxiRankTrip trip)
        {
            trip.UpdatedAt = DateTime.UtcNow;
            _context.TaxiRankTrips.Update(trip);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var trip = await _context.TaxiRankTrips.FindAsync(id);
            if (trip != null)
            {
                _context.TaxiRankTrips.Remove(trip);
                await _context.SaveChangesAsync();
            }
        }
    }

    public class TripPassengerRepository : ITripPassengerRepository
    {
        private readonly MzansiFleetDbContext _context;

        public TripPassengerRepository(MzansiFleetDbContext context)
        {
            _context = context;
        }

        public async Task<TripPassenger?> GetByIdAsync(Guid id)
        {
            return await _context.TripPassengers.FindAsync(id);
        }

        public async Task<IEnumerable<TripPassenger>> GetByTripIdAsync(Guid tripId)
        {
            return await _context.TripPassengers
                .Where(p => p.TaxiRankTripId == tripId)
                .OrderBy(p => p.SeatNumber)
                .ToListAsync();
        }

        public async Task<TripPassenger> AddAsync(TripPassenger passenger)
        {
            _context.TripPassengers.Add(passenger);
            await _context.SaveChangesAsync();
            return passenger;
        }

        public async Task UpdateAsync(TripPassenger passenger)
        {
            _context.TripPassengers.Update(passenger);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var passenger = await _context.TripPassengers.FindAsync(id);
            if (passenger != null)
            {
                _context.TripPassengers.Remove(passenger);
                await _context.SaveChangesAsync();
            }
        }
    }

    public class TripCostRepository : ITripCostRepository
    {
        private readonly MzansiFleetDbContext _context;

        public TripCostRepository(MzansiFleetDbContext context)
        {
            _context = context;
        }

        public async Task<TripCost?> GetByIdAsync(Guid id)
        {
            return await _context.TripCosts.FindAsync(id);
        }

        public async Task<IEnumerable<TripCost>> GetByTripIdAsync(Guid tripId)
        {
            return await _context.TripCosts
                .Where(c => c.TaxiRankTripId == tripId)
                .OrderBy(c => c.CreatedAt)
                .ToListAsync();
        }

        public async Task<TripCost> AddAsync(TripCost cost)
        {
            _context.TripCosts.Add(cost);
            await _context.SaveChangesAsync();
            return cost;
        }

        public async Task UpdateAsync(TripCost cost)
        {
            _context.TripCosts.Update(cost);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var cost = await _context.TripCosts.FindAsync(id);
            if (cost != null)
            {
                _context.TripCosts.Remove(cost);
                await _context.SaveChangesAsync();
            }
        }
    }

    public class TaxiMarshalRepository : ITaxiMarshalRepository
    {
        private readonly MzansiFleetDbContext _context;

        public TaxiMarshalRepository(MzansiFleetDbContext context)
        {
            _context = context;
        }

        public async Task<TaxiMarshalProfile?> GetByIdAsync(Guid id)
        {
            return await _context.TaxiMarshalProfiles
                .Include(m => m.User)
                .FirstOrDefaultAsync(m => m.Id == id);
        }

        public async Task<TaxiMarshalProfile?> GetByUserIdAsync(Guid userId)
        {
            return await _context.TaxiMarshalProfiles
                .Include(m => m.User)
                .FirstOrDefaultAsync(m => m.UserId == userId);
        }

        public async Task<TaxiMarshalProfile?> GetByMarshalCodeAsync(string marshalCode)
        {
            return await _context.TaxiMarshalProfiles
                .Include(m => m.User)
                .FirstOrDefaultAsync(m => m.MarshalCode == marshalCode);
        }

        public async Task<IEnumerable<TaxiMarshalProfile>> GetAllAsync()
        {
            try
            {
                return await _context.TaxiMarshalProfiles
                    .ToListAsync();
            }
            catch
            {
                // Table might not exist yet - return empty list
                return new List<TaxiMarshalProfile>();
            }
        }

        public async Task<IEnumerable<TaxiMarshalProfile>> GetByTenantIdAsync(Guid tenantId)
        {
            try
            {
                return await _context.TaxiMarshalProfiles
                    .Where(m => m.TenantId == tenantId)
                    .ToListAsync();
            }
            catch
            {
                // Table might not exist yet - return empty list
                return new List<TaxiMarshalProfile>();
            }
        }

        public async Task<IEnumerable<TaxiMarshalProfile>> GetByTaxiRankIdAsync(Guid taxiRankId)
        {
            return await _context.TaxiMarshalProfiles
                .Include(m => m.User)
                .Include(m => m.TaxiRank)
                .Where(m => m.TaxiRankId == taxiRankId)
                .OrderBy(m => m.FullName)
                .ToListAsync();
        }

        public async Task<TaxiMarshalProfile> AddAsync(TaxiMarshalProfile marshal)
        {
            _context.TaxiMarshalProfiles.Add(marshal);
            await _context.SaveChangesAsync();
            return marshal;
        }

        public async Task UpdateAsync(TaxiMarshalProfile marshal)
        {
            marshal.UpdatedAt = DateTime.UtcNow;
            _context.TaxiMarshalProfiles.Update(marshal);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var marshal = await _context.TaxiMarshalProfiles.FindAsync(id);
            if (marshal != null)
            {
                _context.TaxiMarshalProfiles.Remove(marshal);
                await _context.SaveChangesAsync();
            }
        }
    }

    public class ScheduledTripBookingRepository : IScheduledTripBookingRepository
    {
        private readonly MzansiFleetDbContext _context;
        public ScheduledTripBookingRepository(MzansiFleetDbContext context) { _context = context; }

        public async Task<ScheduledTripBooking?> GetByIdAsync(Guid id)
            => await _context.ScheduledTripBookings
                .Include(b => b.Route)
                .Include(b => b.TaxiRank)
                .FirstOrDefaultAsync(b => b.Id == id);

        public async Task<IEnumerable<ScheduledTripBooking>> GetByUserIdAsync(Guid userId)
            => await _context.ScheduledTripBookings
                .Include(b => b.Route)
                .Include(b => b.TaxiRank)
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.TravelDate)
                .ToListAsync();

        public async Task<IEnumerable<ScheduledTripBooking>> GetByTaxiRankIdAsync(Guid taxiRankId)
            => await _context.ScheduledTripBookings
                .Include(b => b.Route)
                .Where(b => b.TaxiRankId == taxiRankId)
                .OrderByDescending(b => b.TravelDate)
                .ToListAsync();

        public async Task<IEnumerable<ScheduledTripBooking>> GetByRouteIdAsync(Guid routeId)
            => await _context.ScheduledTripBookings
                .Where(b => b.RouteId == routeId)
                .OrderByDescending(b => b.TravelDate)
                .ToListAsync();

        public async Task<IEnumerable<ScheduledTripBooking>> GetByRouteAndDateAsync(Guid routeId, DateTime travelDate)
            => await _context.ScheduledTripBookings
                .Where(b => b.RouteId == routeId && b.TravelDate.Date == travelDate.Date && b.Status != "Cancelled")
                .ToListAsync();

        public async Task<ScheduledTripBooking> AddAsync(ScheduledTripBooking booking)
        {
            _context.ScheduledTripBookings.Add(booking);
            await _context.SaveChangesAsync();
            return booking;
        }

        public async Task<ScheduledTripBooking> UpdateAsync(ScheduledTripBooking booking)
        {
            booking.UpdatedAt = DateTime.UtcNow;
            _context.ScheduledTripBookings.Update(booking);
            await _context.SaveChangesAsync();
            return booking;
        }

        public async Task DeleteAsync(Guid id)
        {
            var booking = await _context.ScheduledTripBookings.FindAsync(id);
            if (booking != null)
            {
                _context.ScheduledTripBookings.Remove(booking);
                await _context.SaveChangesAsync();
            }
        }
    }
}

