using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class VehicleServiceAlert
    {
        public Guid VehicleId { get; set; }
        public string Registration { get; set; }
        public string Make { get; set; }
        public string Model { get; set; }
        public int CurrentMileage { get; set; }
        public DateTime? LastServiceDate { get; set; }
        public DateTime? NextServiceDate { get; set; }
        public int DaysUntilService { get; set; }
        public int MileageUntilService { get; set; }
        public string AlertLevel { get; set; } // "Critical", "Warning", "Info"
        public string AlertMessage { get; set; }
    }

    public class GetVehiclesNeedingServiceQueryHandler : IRequestHandler<GetVehiclesNeedingServiceQuery, IEnumerable<VehicleServiceAlert>>
    {
        private readonly IVehicleRepository _vehicleRepository;

        public GetVehiclesNeedingServiceQueryHandler(IVehicleRepository vehicleRepository)
        {
            _vehicleRepository = vehicleRepository;
        }

        public async Task<IEnumerable<VehicleServiceAlert>> Handle(GetVehiclesNeedingServiceQuery request, CancellationToken cancellationToken)
        {
            var vehicles = await _vehicleRepository.GetAllAsync();
            var alerts = new List<VehicleServiceAlert>();
            var today = DateTime.UtcNow;

            foreach (var vehicle in vehicles)
            {
                var alert = new VehicleServiceAlert
                {
                    VehicleId = vehicle.Id,
                    Registration = vehicle.Registration,
                    Make = vehicle.Make,
                    Model = vehicle.Model,
                    CurrentMileage = vehicle.Mileage,
                    LastServiceDate = vehicle.LastServiceDate,
                    NextServiceDate = vehicle.NextServiceDate
                };

                // Check date-based service due
                if (vehicle.NextServiceDate.HasValue)
                {
                    var daysUntilService = (vehicle.NextServiceDate.Value - today).Days;
                    alert.DaysUntilService = daysUntilService;

                    if (daysUntilService <= 0)
                    {
                        alert.AlertLevel = "Critical";
                        alert.AlertMessage = $"Service is overdue by {Math.Abs(daysUntilService)} days!";
                        alerts.Add(alert);
                        continue;
                    }
                    else if (daysUntilService <= request.DaysThreshold)
                    {
                        alert.AlertLevel = "Warning";
                        alert.AlertMessage = $"Service due in {daysUntilService} days";
                        alerts.Add(alert);
                        continue;
                    }
                }

                // Check mileage-based service due
                if (vehicle.ServiceIntervalKm > 0)
                {
                    var mileageUntilService = vehicle.ServiceIntervalKm - (vehicle.Mileage % vehicle.ServiceIntervalKm);
                    alert.MileageUntilService = mileageUntilService;

                    if (mileageUntilService <= 0)
                    {
                        alert.AlertLevel = "Critical";
                        alert.AlertMessage = $"Service overdue by {Math.Abs(mileageUntilService)} km!";
                        alerts.Add(alert);
                    }
                    else if (mileageUntilService <= request.MileageThreshold)
                    {
                        alert.AlertLevel = "Warning";
                        alert.AlertMessage = $"Service due in {mileageUntilService} km";
                        alerts.Add(alert);
                    }
                }
            }

            return alerts.OrderBy(a => a.AlertLevel == "Critical" ? 0 : a.AlertLevel == "Warning" ? 1 : 2);
        }
    }
}
