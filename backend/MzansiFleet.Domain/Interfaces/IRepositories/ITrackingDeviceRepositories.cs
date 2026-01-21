using System;
using System.Collections.Generic;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Domain.Interfaces.IRepositories
{
    public interface ITrackingDeviceRequestRepository
    {
        IEnumerable<TrackingDeviceRequest> GetAll();
        TrackingDeviceRequest? GetById(Guid id);
        IEnumerable<TrackingDeviceRequest> GetByOwnerId(Guid ownerId);
        IEnumerable<TrackingDeviceRequest> GetOpenRequests(); // For service providers to browse
        void Add(TrackingDeviceRequest entity);
        void Update(TrackingDeviceRequest entity);
        void Delete(Guid id);
        int GetOfferCount(Guid requestId);
    }

    public interface ITrackingDeviceOfferRepository
    {
        IEnumerable<TrackingDeviceOffer> GetAll();
        TrackingDeviceOffer? GetById(Guid id);
        IEnumerable<TrackingDeviceOffer> GetByRequestId(Guid requestId);
        IEnumerable<TrackingDeviceOffer> GetByServiceProviderId(Guid serviceProviderId);
        void Add(TrackingDeviceOffer entity);
        void Update(TrackingDeviceOffer entity);
        void Delete(Guid id);
        bool HasProviderOfferedForRequest(Guid serviceProviderId, Guid requestId);
    }
}
