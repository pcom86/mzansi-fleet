using System;
using System.Collections.Generic;
using System.Linq;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Repository;

namespace MzansiFleet.Repository.Repositories
{
    public class TrackingDeviceRequestRepository : ITrackingDeviceRequestRepository
    {
        private readonly MzansiFleetDbContext _context;

        public TrackingDeviceRequestRepository(MzansiFleetDbContext context)
        {
            _context = context;
        }

        public IEnumerable<TrackingDeviceRequest> GetAll()
        {
            return _context.TrackingDeviceRequests.ToList();
        }

        public TrackingDeviceRequest? GetById(Guid id)
        {
            return _context.TrackingDeviceRequests.Find(id);
        }

        public IEnumerable<TrackingDeviceRequest> GetByOwnerId(Guid ownerId)
        {
            return _context.TrackingDeviceRequests
                .Where(r => r.OwnerId == ownerId)
                .OrderByDescending(r => r.CreatedAt)
                .ToList();
        }

        public IEnumerable<TrackingDeviceRequest> GetOpenRequests()
        {
            return _context.TrackingDeviceRequests
                .Where(r => r.Status == "Open" || r.Status == "OfferReceived")
                .OrderByDescending(r => r.CreatedAt)
                .ToList();
        }

        public void Add(TrackingDeviceRequest entity)
        {
            _context.TrackingDeviceRequests.Add(entity);
            _context.SaveChanges();
        }

        public void Update(TrackingDeviceRequest entity)
        {
            entity.UpdatedAt = DateTime.UtcNow;
            _context.TrackingDeviceRequests.Update(entity);
            _context.SaveChanges();
        }

        public void Delete(Guid id)
        {
            var entity = GetById(id);
            if (entity != null)
            {
                _context.TrackingDeviceRequests.Remove(entity);
                _context.SaveChanges();
            }
        }

        public int GetOfferCount(Guid requestId)
        {
            return _context.TrackingDeviceOffers
                .Count(o => o.TrackingDeviceRequestId == requestId);
        }
    }

    public class TrackingDeviceOfferRepository : ITrackingDeviceOfferRepository
    {
        private readonly MzansiFleetDbContext _context;

        public TrackingDeviceOfferRepository(MzansiFleetDbContext context)
        {
            _context = context;
        }

        public IEnumerable<TrackingDeviceOffer> GetAll()
        {
            return _context.TrackingDeviceOffers.ToList();
        }

        public TrackingDeviceOffer? GetById(Guid id)
        {
            return _context.TrackingDeviceOffers.Find(id);
        }

        public IEnumerable<TrackingDeviceOffer> GetByRequestId(Guid requestId)
        {
            return _context.TrackingDeviceOffers
                .Where(o => o.TrackingDeviceRequestId == requestId)
                .OrderByDescending(o => o.SubmittedAt)
                .ToList();
        }

        public IEnumerable<TrackingDeviceOffer> GetByServiceProviderId(Guid serviceProviderId)
        {
            return _context.TrackingDeviceOffers
                .Where(o => o.ServiceProviderId == serviceProviderId)
                .OrderByDescending(o => o.SubmittedAt)
                .ToList();
        }

        public void Add(TrackingDeviceOffer entity)
        {
            _context.TrackingDeviceOffers.Add(entity);
            _context.SaveChanges();
        }

        public void Update(TrackingDeviceOffer entity)
        {
            _context.TrackingDeviceOffers.Update(entity);
            _context.SaveChanges();
        }

        public void Delete(Guid id)
        {
            var entity = GetById(id);
            if (entity != null)
            {
                _context.TrackingDeviceOffers.Remove(entity);
                _context.SaveChanges();
            }
        }

        public bool HasProviderOfferedForRequest(Guid serviceProviderId, Guid requestId)
        {
            return _context.TrackingDeviceOffers
                .Any(o => o.ServiceProviderId == serviceProviderId && o.TrackingDeviceRequestId == requestId);
        }
    }
}
