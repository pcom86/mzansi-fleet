using System;
using System.Collections.Generic;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Domain.Interfaces.IRepositories
{
    public interface ITripRequestRepository
    {
        IEnumerable<TripRequest> GetAll();
        TripRequest? GetById(Guid id);
        void Add(TripRequest entity);
        void Update(TripRequest entity);
        void Delete(Guid id);
    }
    public interface ITripOfferRepository
    {
        IEnumerable<TripOffer> GetAll();
        TripOffer? GetById(Guid id);
        void Add(TripOffer entity);
        void Update(TripOffer entity);
        void Delete(Guid id);
    }
    public interface ITripBookingRepository
    {
        IEnumerable<TripBooking> GetAll();
        TripBooking? GetById(Guid id);
        void Add(TripBooking entity);
        void Update(TripBooking entity);
        void Delete(Guid id);
    }
    public interface ITripStopRepository
    {
        IEnumerable<TripStop> GetAll();
        TripStop? GetById(Guid id);
        void Add(TripStop entity);
        void Update(TripStop entity);
        void Delete(Guid id);
    }
    public interface IPoolingGroupRepository
    {
        IEnumerable<PoolingGroup> GetAll();
        PoolingGroup? GetById(Guid id);
        void Add(PoolingGroup entity);
        void Update(PoolingGroup entity);
        void Delete(Guid id);
    }
}

