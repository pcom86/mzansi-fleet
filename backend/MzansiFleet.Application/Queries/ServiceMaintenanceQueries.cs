using System;
using System.Collections.Generic;
using MediatR;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Application.Handlers;

namespace MzansiFleet.Application.Queries
{
    // Service History Queries
    public class GetServiceHistoryByIdQuery : IRequest<ServiceHistory>
    {
        public Guid Id { get; set; }
    }

    public class GetAllServiceHistoriesQuery : IRequest<IEnumerable<ServiceHistory>>
    {
    }

    public class GetServiceHistoryByVehicleIdQuery : IRequest<IEnumerable<ServiceHistory>>
    {
        public Guid VehicleId { get; set; }
    }

    public class GetLatestServiceByVehicleIdQuery : IRequest<ServiceHistory>
    {
        public Guid VehicleId { get; set; }
    }

    // Maintenance History Queries
    public class GetMaintenanceHistoryByIdQuery : IRequest<MaintenanceHistory>
    {
        public Guid Id { get; set; }
    }

    public class GetAllMaintenanceHistoriesQuery : IRequest<IEnumerable<MaintenanceHistory>>
    {
    }

    public class GetMaintenanceHistoryByVehicleIdQuery : IRequest<IEnumerable<MaintenanceHistory>>
    {
        public Guid VehicleId { get; set; }
    }

    public class GetLatestMaintenanceByVehicleIdQuery : IRequest<MaintenanceHistory>
    {
        public Guid VehicleId { get; set; }
    }

    // Vehicle Service Alerts Query
    public class GetVehiclesNeedingServiceQuery : IRequest<IEnumerable<VehicleServiceAlert>>
    {
        public int DaysThreshold { get; set; } = 7; // Alert 7 days before
        public int MileageThreshold { get; set; } = 500; // Alert 500km before
    }
}
