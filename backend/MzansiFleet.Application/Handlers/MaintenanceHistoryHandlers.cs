using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    // Maintenance History Command Handlers
    public class CreateMaintenanceHistoryCommandHandler : IRequestHandler<CreateMaintenanceHistoryCommand, MaintenanceHistory>
    {
        private readonly IMaintenanceHistoryRepository _repository;
        private readonly IVehicleRepository _vehicleRepository;

        public CreateMaintenanceHistoryCommandHandler(IMaintenanceHistoryRepository repository, IVehicleRepository vehicleRepository)
        {
            _repository = repository;
            _vehicleRepository = vehicleRepository;
        }

        public async Task<MaintenanceHistory> Handle(CreateMaintenanceHistoryCommand request, CancellationToken cancellationToken)
        {
            var entity = new MaintenanceHistory
            {
                Id = request.Id == Guid.Empty ? Guid.NewGuid() : request.Id,
                VehicleId = request.VehicleId,
                MaintenanceDate = request.MaintenanceDate,
                MaintenanceType = request.MaintenanceType,
                Component = request.Component,
                Description = request.Description,
                MileageAtMaintenance = request.MileageAtMaintenance,
                Cost = request.Cost,
                ServiceProvider = request.ServiceProvider,
                Priority = request.Priority,
                Status = request.Status,
                ScheduledDate = request.ScheduledDate,
                CompletedDate = request.CompletedDate,
                Notes = request.Notes ?? string.Empty,
                InvoiceNumber = request.InvoiceNumber ?? string.Empty,
                PerformedBy = request.PerformedBy ?? string.Empty
            };

            var result = await _repository.AddAsync(entity);

            // Update vehicle's last maintenance date
            if (request.Status == "Completed")
            {
                var vehicle = await _vehicleRepository.GetByIdAsync(request.VehicleId);
                if (vehicle != null)
                {
                    vehicle.LastMaintenanceDate = request.CompletedDate ?? request.MaintenanceDate;
                    vehicle.Mileage = request.MileageAtMaintenance;
                    await _vehicleRepository.UpdateAsync(vehicle);
                }
            }

            return result;
        }
    }

    public class UpdateMaintenanceHistoryCommandHandler : IRequestHandler<UpdateMaintenanceHistoryCommand, MaintenanceHistory>
    {
        private readonly IMaintenanceHistoryRepository _repository;

        public UpdateMaintenanceHistoryCommandHandler(IMaintenanceHistoryRepository repository)
        {
            _repository = repository;
        }

        public async Task<MaintenanceHistory> Handle(UpdateMaintenanceHistoryCommand request, CancellationToken cancellationToken)
        {
            var entity = await _repository.GetByIdAsync(request.Id);
            if (entity == null) return null;

            entity.MaintenanceDate = request.MaintenanceDate;
            entity.MaintenanceType = request.MaintenanceType;
            entity.Component = request.Component;
            entity.Description = request.Description;
            entity.MileageAtMaintenance = request.MileageAtMaintenance;
            entity.Cost = request.Cost;
            entity.ServiceProvider = request.ServiceProvider;
            entity.Priority = request.Priority;
            entity.Status = request.Status;
            entity.ScheduledDate = request.ScheduledDate;
            entity.CompletedDate = request.CompletedDate;
            entity.Notes = request.Notes ?? string.Empty;
            entity.InvoiceNumber = request.InvoiceNumber ?? string.Empty;
            entity.PerformedBy = request.PerformedBy ?? string.Empty;

            return await _repository.UpdateAsync(entity);
        }
    }

    public class DeleteMaintenanceHistoryCommandHandler : IRequestHandler<DeleteMaintenanceHistoryCommand, Unit>
    {
        private readonly IMaintenanceHistoryRepository _repository;

        public DeleteMaintenanceHistoryCommandHandler(IMaintenanceHistoryRepository repository)
        {
            _repository = repository;
        }

        public async Task<Unit> Handle(DeleteMaintenanceHistoryCommand request, CancellationToken cancellationToken)
        {
            await _repository.DeleteAsync(request.Id);
            return Unit.Value;
        }
    }

    // Maintenance History Query Handlers
    public class GetMaintenanceHistoryByIdQueryHandler : IRequestHandler<GetMaintenanceHistoryByIdQuery, MaintenanceHistory>
    {
        private readonly IMaintenanceHistoryRepository _repository;

        public GetMaintenanceHistoryByIdQueryHandler(IMaintenanceHistoryRepository repository)
        {
            _repository = repository;
        }

        public async Task<MaintenanceHistory> Handle(GetMaintenanceHistoryByIdQuery request, CancellationToken cancellationToken)
        {
            return await _repository.GetByIdAsync(request.Id);
        }
    }

    public class GetAllMaintenanceHistoriesQueryHandler : IRequestHandler<GetAllMaintenanceHistoriesQuery, IEnumerable<MaintenanceHistory>>
    {
        private readonly IMaintenanceHistoryRepository _repository;

        public GetAllMaintenanceHistoriesQueryHandler(IMaintenanceHistoryRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<MaintenanceHistory>> Handle(GetAllMaintenanceHistoriesQuery request, CancellationToken cancellationToken)
        {
            return await _repository.GetAllAsync();
        }
    }

    public class GetMaintenanceHistoryByVehicleIdQueryHandler : IRequestHandler<GetMaintenanceHistoryByVehicleIdQuery, IEnumerable<MaintenanceHistory>>
    {
        private readonly IMaintenanceHistoryRepository _repository;

        public GetMaintenanceHistoryByVehicleIdQueryHandler(IMaintenanceHistoryRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<MaintenanceHistory>> Handle(GetMaintenanceHistoryByVehicleIdQuery request, CancellationToken cancellationToken)
        {
            return await _repository.GetByVehicleIdAsync(request.VehicleId);
        }
    }

    public class GetLatestMaintenanceByVehicleIdQueryHandler : IRequestHandler<GetLatestMaintenanceByVehicleIdQuery, MaintenanceHistory>
    {
        private readonly IMaintenanceHistoryRepository _repository;

        public GetLatestMaintenanceByVehicleIdQueryHandler(IMaintenanceHistoryRepository repository)
        {
            _repository = repository;
        }

        public async Task<MaintenanceHistory> Handle(GetLatestMaintenanceByVehicleIdQuery request, CancellationToken cancellationToken)
        {
            return await _repository.GetLatestMaintenanceByVehicleIdAsync(request.VehicleId);
        }
    }
}
