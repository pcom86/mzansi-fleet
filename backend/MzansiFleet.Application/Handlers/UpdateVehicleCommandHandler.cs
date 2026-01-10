using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class UpdateVehicleCommandHandler : IRequestHandler<UpdateVehicleCommand, Vehicle>
    {
        private readonly IVehicleRepository _repository;
        public UpdateVehicleCommandHandler(IVehicleRepository repository)
        {
            _repository = repository;
        }
        public Task<Vehicle> Handle(UpdateVehicleCommand request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            if (entity == null) return Task.FromResult<Vehicle>(null);
            // entity.OwnerId = request.OwnerId; // Not present in Vehicle entity
            entity.Make = request.Make;
            entity.Model = request.Model;
            entity.Registration = request.RegistrationNumber; // Map RegistrationNumber to Registration
            entity.Year = request.Year;
            // entity.Color = request.Color; // Not present in Vehicle entity
            entity.Status = request.State; // Map State to Status
            _repository.Update(entity);
            return Task.FromResult(entity);
        }
    }
}
