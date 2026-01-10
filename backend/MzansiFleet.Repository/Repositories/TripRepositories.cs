using System;
using System.Collections.Generic;
using System.Linq;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Repository.Repositories
{
    public class TripRequestRepository : ITripRequestRepository
    {
        private readonly MzansiFleetDbContext _context;
        public TripRequestRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<TripRequest> GetAll() => _context.TripRequests.ToList();
        public TripRequest GetById(Guid id) => _context.TripRequests.Find(id);
        public void Add(TripRequest entity) { _context.TripRequests.Add(entity); _context.SaveChanges(); }
        public void Update(TripRequest entity) { _context.TripRequests.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.TripRequests.Find(id); if (entity != null) { _context.TripRequests.Remove(entity); _context.SaveChanges(); } }
    }
    public class TripOfferRepository : ITripOfferRepository
    {
        private readonly MzansiFleetDbContext _context;
        public TripOfferRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<TripOffer> GetAll() => _context.TripOffers.ToList();
        public TripOffer GetById(Guid id) => _context.TripOffers.Find(id);
        public void Add(TripOffer entity) { _context.TripOffers.Add(entity); _context.SaveChanges(); }
        public void Update(TripOffer entity) { _context.TripOffers.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.TripOffers.Find(id); if (entity != null) { _context.TripOffers.Remove(entity); _context.SaveChanges(); } }
    }
    public class TripBookingRepository : ITripBookingRepository
    {
        private readonly MzansiFleetDbContext _context;
        public TripBookingRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<TripBooking> GetAll() => _context.TripBookings.ToList();
        public TripBooking GetById(Guid id) => _context.TripBookings.Find(id);
        public void Add(TripBooking entity) { _context.TripBookings.Add(entity); _context.SaveChanges(); }
        public void Update(TripBooking entity) { _context.TripBookings.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.TripBookings.Find(id); if (entity != null) { _context.TripBookings.Remove(entity); _context.SaveChanges(); } }
    }
    public class TripStopRepository : ITripStopRepository
    {
        private readonly MzansiFleetDbContext _context;
        public TripStopRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<TripStop> GetAll() => _context.TripStops.ToList();
        public TripStop GetById(Guid id) => _context.TripStops.Find(id);
        public void Add(TripStop entity) { _context.TripStops.Add(entity); _context.SaveChanges(); }
        public void Update(TripStop entity) { _context.TripStops.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.TripStops.Find(id); if (entity != null) { _context.TripStops.Remove(entity); _context.SaveChanges(); } }
    }
    public class PoolingGroupRepository : IPoolingGroupRepository
    {
        private readonly MzansiFleetDbContext _context;
        public PoolingGroupRepository(MzansiFleetDbContext context) { _context = context; }
        public IEnumerable<PoolingGroup> GetAll() => _context.PoolingGroups.ToList();
        public PoolingGroup GetById(Guid id) => _context.PoolingGroups.Find(id);
        public void Add(PoolingGroup entity) { _context.PoolingGroups.Add(entity); _context.SaveChanges(); }
        public void Update(PoolingGroup entity) { _context.PoolingGroups.Update(entity); _context.SaveChanges(); }
        public void Delete(Guid id) { var entity = _context.PoolingGroups.Find(id); if (entity != null) { _context.PoolingGroups.Remove(entity); _context.SaveChanges(); } }
    }
}

