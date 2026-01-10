using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Domain.Interfaces.IRepositories
{
    public interface ITaxiRankRepository
    {
        Task<TaxiRank?> GetByIdAsync(Guid id);
        Task<IEnumerable<TaxiRank>> GetAllAsync();
        Task<IEnumerable<TaxiRank>> GetByTenantIdAsync(Guid tenantId);
        Task<TaxiRank?> GetByCodeAsync(string code);
        Task<TaxiRank> AddAsync(TaxiRank rank);
        Task<TaxiRank> UpdateAsync(TaxiRank rank);
        Task DeleteAsync(Guid id);
    }
    public interface ITaxiRankAdminRepository
    {
        Task<TaxiRankAdminProfile?> GetByIdAsync(Guid id);
        Task<IEnumerable<TaxiRankAdminProfile>> GetAllAsync();
        Task<IEnumerable<TaxiRankAdminProfile>> GetByTenantIdAsync(Guid tenantId);
        Task<TaxiRankAdminProfile?> GetByUserIdAsync(Guid userId);
        Task<IEnumerable<TaxiRankAdminProfile>> GetByTaxiRankIdAsync(Guid taxiRankId);
        Task<TaxiRankAdminProfile?> GetByAdminCodeAsync(string adminCode);
        Task<TaxiRankAdminProfile> AddAsync(TaxiRankAdminProfile admin);
        Task<TaxiRankAdminProfile> UpdateAsync(TaxiRankAdminProfile admin);
        Task DeleteAsync(Guid id);
    }

    public interface IVehicleTaxiRankRepository
    {
        Task<VehicleTaxiRank?> GetByIdAsync(Guid id);
        Task<IEnumerable<VehicleTaxiRank>> GetByTaxiRankIdAsync(Guid taxiRankId);
        Task<IEnumerable<VehicleTaxiRank>> GetByVehicleIdAsync(Guid vehicleId);
        Task<VehicleTaxiRank?> GetActiveByVehicleIdAsync(Guid vehicleId);
        Task<VehicleTaxiRank> AddAsync(VehicleTaxiRank assignment);
        Task<VehicleTaxiRank> UpdateAsync(VehicleTaxiRank assignment);
        Task DeleteAsync(Guid id);
    }

    public interface ITripScheduleRepository
    {
        Task<TripSchedule?> GetByIdAsync(Guid id);
        Task<IEnumerable<TripSchedule>> GetAllAsync();
        Task<IEnumerable<TripSchedule>> GetByTaxiRankIdAsync(Guid taxiRankId);
        Task<IEnumerable<TripSchedule>> GetByTenantIdAsync(Guid tenantId);
        Task<IEnumerable<TripSchedule>> GetActiveByTaxiRankIdAsync(Guid taxiRankId);
        Task<TripSchedule> AddAsync(TripSchedule schedule);
        Task<TripSchedule> UpdateAsync(TripSchedule schedule);
        Task DeleteAsync(Guid id);
    }
    public interface ITaxiRankTripRepository
    {
        Task<TaxiRankTrip?> GetByIdAsync(Guid id);
        Task<IEnumerable<TaxiRankTrip>> GetAllAsync();
        Task<IEnumerable<TaxiRankTrip>> GetByTenantIdAsync(Guid tenantId);
        Task<IEnumerable<TaxiRankTrip>> GetByVehicleIdAsync(Guid vehicleId);
        Task<IEnumerable<TaxiRankTrip>> GetByDriverIdAsync(Guid driverId);
        Task<IEnumerable<TaxiRankTrip>> GetByMarshalIdAsync(Guid marshalId);
        Task<IEnumerable<TaxiRankTrip>> GetByTaxiRankIdAsync(Guid taxiRankId);
        Task<IEnumerable<TaxiRankTrip>> GetByDateRangeAsync(DateTime startDate, DateTime endDate, Guid? tenantId = null);
        Task<TaxiRankTrip> AddAsync(TaxiRankTrip trip);
        Task UpdateAsync(TaxiRankTrip trip);
        Task DeleteAsync(Guid id);
    }

    public interface ITripPassengerRepository
    {
        Task<TripPassenger?> GetByIdAsync(Guid id);
        Task<IEnumerable<TripPassenger>> GetByTripIdAsync(Guid tripId);
        Task<TripPassenger> AddAsync(TripPassenger passenger);
        Task UpdateAsync(TripPassenger passenger);
        Task DeleteAsync(Guid id);
    }

    public interface ITripCostRepository
    {
        Task<TripCost?> GetByIdAsync(Guid id);
        Task<IEnumerable<TripCost>> GetByTripIdAsync(Guid tripId);
        Task<TripCost> AddAsync(TripCost cost);
        Task UpdateAsync(TripCost cost);
        Task DeleteAsync(Guid id);
    }

    public interface ITaxiMarshalRepository
    {
        Task<TaxiMarshalProfile?> GetByIdAsync(Guid id);
        Task<TaxiMarshalProfile?> GetByUserIdAsync(Guid userId);
        Task<TaxiMarshalProfile?> GetByMarshalCodeAsync(string marshalCode);
        Task<IEnumerable<TaxiMarshalProfile>> GetAllAsync();
        Task<IEnumerable<TaxiMarshalProfile>> GetByTenantIdAsync(Guid tenantId);
        Task<IEnumerable<TaxiMarshalProfile>> GetByTaxiRankIdAsync(Guid taxiRankId);
        Task<TaxiMarshalProfile> AddAsync(TaxiMarshalProfile marshal);
        Task UpdateAsync(TaxiMarshalProfile marshal);
        Task DeleteAsync(Guid id);
    }
}
