using System;
using System.Collections.Generic;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Domain.Interfaces.IRepositories
{
    public interface IStaffProfileRepository
    {
        IEnumerable<StaffProfile> GetAll();
        StaffProfile? GetById(Guid id);
        void Add(StaffProfile entity);
        void Update(StaffProfile entity);
        void Delete(Guid id);
    }
    public interface IDriverProfileRepository
    {
        IEnumerable<DriverProfile> GetAll();
        DriverProfile? GetById(Guid id);
        void Add(DriverProfile entity);
        void Update(DriverProfile entity);
        void Delete(Guid id);
    }
    public interface IPassengerProfileRepository
    {
        IEnumerable<PassengerProfile> GetAll();
        PassengerProfile? GetById(Guid id);
        void Add(PassengerProfile entity);
        void Update(PassengerProfile entity);
        void Delete(Guid id);
    }
    public interface IMechanicProfileRepository
    {
        IEnumerable<MechanicProfile> GetAll();
        MechanicProfile? GetById(Guid id);
        void Add(MechanicProfile entity);
        void Update(MechanicProfile entity);
        void Delete(Guid id);
    }
    public interface IShopProfileRepository
    {
        IEnumerable<ShopProfile> GetAll();
        ShopProfile? GetById(Guid id);
        void Add(ShopProfile entity);
        void Update(ShopProfile entity);
        void Delete(Guid id);
    }

    public interface IServiceProviderProfileRepository
    {
        IEnumerable<ServiceProviderProfile> GetAll();
        ServiceProviderProfile? GetById(Guid id);
        ServiceProviderProfile? GetByUserId(Guid userId);
        void Add(ServiceProviderProfile entity);
        void Update(ServiceProviderProfile entity);
        void Delete(Guid id);
        IEnumerable<ServiceProviderProfile> GetActiveProviders();
        IEnumerable<ServiceProviderProfile> GetAvailableProviders();
    }

    public interface IServiceProviderRepository
    {
        IEnumerable<ServiceProvider> GetAll();
        ServiceProvider? GetById(Guid id);
        void Add(ServiceProvider entity);
        void Update(ServiceProvider entity);
        void Delete(Guid id);
        IEnumerable<ServiceProvider> GetActiveProviders();
        IEnumerable<ServiceProvider> GetProvidersByServiceType(string serviceType);
    }
}

