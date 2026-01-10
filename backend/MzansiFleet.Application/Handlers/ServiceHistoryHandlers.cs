using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    // Service History Command Handlers
    public class CreateServiceHistoryCommandHandler : IRequestHandler<CreateServiceHistoryCommand, ServiceHistory>
    {
        private readonly IServiceHistoryRepository _repository;
        private readonly IVehicleRepository _vehicleRepository;

        public CreateServiceHistoryCommandHandler(IServiceHistoryRepository repository, IVehicleRepository vehicleRepository)
        {
            _repository = repository;
            _vehicleRepository = vehicleRepository;
        }

        public async Task<ServiceHistory> Handle(CreateServiceHistoryCommand request, CancellationToken cancellationToken)
        {
            var entity = new ServiceHistory
            {
                Id = request.Id == Guid.Empty ? Guid.NewGuid() : request.Id,
                VehicleId = request.VehicleId,
                ServiceDate = request.ServiceDate,
                ServiceType = request.ServiceType,
                Description = request.Description,
                MileageAtService = request.MileageAtService,
                Cost = request.Cost,
                ServiceProvider = request.ServiceProvider,
                NextServiceDate = request.NextServiceDate,
                NextServiceMileage = request.NextServiceMileage,
                Notes = request.Notes,
                InvoiceNumber = request.InvoiceNumber
            };

            var result = await _repository.AddAsync(entity);

            // Update vehicle's last service date and next service date
            var vehicle = await _vehicleRepository.GetByIdAsync(request.VehicleId);
            if (vehicle != null)
            {
                vehicle.LastServiceDate = request.ServiceDate;
                vehicle.NextServiceDate = request.NextServiceDate;
                vehicle.Mileage = request.MileageAtService;
                await _vehicleRepository.UpdateAsync(vehicle);
            }

            return result;
        }
    }

    public class UpdateServiceHistoryCommandHandler : IRequestHandler<UpdateServiceHistoryCommand, ServiceHistory>
    {
        private readonly IServiceHistoryRepository _repository;

        public UpdateServiceHistoryCommandHandler(IServiceHistoryRepository repository)
        {
            _repository = repository;
        }

        public async Task<ServiceHistory> Handle(UpdateServiceHistoryCommand request, CancellationToken cancellationToken)
        {
            var entity = await _repository.GetByIdAsync(request.Id);
            if (entity == null) return null;

            entity.ServiceDate = request.ServiceDate;
            entity.ServiceType = request.ServiceType;
            entity.Description = request.Description;
            entity.MileageAtService = request.MileageAtService;
            entity.Cost = request.Cost;
            entity.ServiceProvider = request.ServiceProvider;
            entity.NextServiceDate = request.NextServiceDate;
            entity.NextServiceMileage = request.NextServiceMileage;
            entity.Notes = request.Notes;
            entity.InvoiceNumber = request.InvoiceNumber;

            return await _repository.UpdateAsync(entity);
        }
    }

    public class DeleteServiceHistoryCommandHandler : IRequestHandler<DeleteServiceHistoryCommand, Unit>
    {
        private readonly IServiceHistoryRepository _repository;

        public DeleteServiceHistoryCommandHandler(IServiceHistoryRepository repository)
        {
            _repository = repository;
        }

        public async Task<Unit> Handle(DeleteServiceHistoryCommand request, CancellationToken cancellationToken)
        {
            await _repository.DeleteAsync(request.Id);
            return Unit.Value;
        }
    }

    // Service History Query Handlers
    public class GetServiceHistoryByIdQueryHandler : IRequestHandler<GetServiceHistoryByIdQuery, ServiceHistory>
    {
        private readonly IServiceHistoryRepository _repository;

        public GetServiceHistoryByIdQueryHandler(IServiceHistoryRepository repository)
        {
            _repository = repository;
        }

        public async Task<ServiceHistory> Handle(GetServiceHistoryByIdQuery request, CancellationToken cancellationToken)
        {
            return await _repository.GetByIdAsync(request.Id);
        }
    }

    public class GetAllServiceHistoriesQueryHandler : IRequestHandler<GetAllServiceHistoriesQuery, IEnumerable<ServiceHistory>>
    {
        private readonly IServiceHistoryRepository _repository;

        public GetAllServiceHistoriesQueryHandler(IServiceHistoryRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<ServiceHistory>> Handle(GetAllServiceHistoriesQuery request, CancellationToken cancellationToken)
        {
            return await _repository.GetAllAsync();
        }
    }

    public class GetServiceHistoryByVehicleIdQueryHandler : IRequestHandler<GetServiceHistoryByVehicleIdQuery, IEnumerable<ServiceHistory>>
    {
        private readonly IServiceHistoryRepository _repository;

        public GetServiceHistoryByVehicleIdQueryHandler(IServiceHistoryRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<ServiceHistory>> Handle(GetServiceHistoryByVehicleIdQuery request, CancellationToken cancellationToken)
        {
            return await _repository.GetByVehicleIdAsync(request.VehicleId);
        }
    }

    public class GetLatestServiceByVehicleIdQueryHandler : IRequestHandler<GetLatestServiceByVehicleIdQuery, ServiceHistory>
    {
        private readonly IServiceHistoryRepository _repository;

        public GetLatestServiceByVehicleIdQueryHandler(IServiceHistoryRepository repository)
        {
            _repository = repository;
        }

        public async Task<ServiceHistory> Handle(GetLatestServiceByVehicleIdQuery request, CancellationToken cancellationToken)
        {
            return await _repository.GetLatestServiceByVehicleIdAsync(request.VehicleId);
        }
    }
}
