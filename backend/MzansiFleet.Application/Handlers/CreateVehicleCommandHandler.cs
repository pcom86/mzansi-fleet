using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class CreateVehicleCommandHandler : IRequestHandler<CreateVehicleCommand, Vehicle>
    {
        private readonly IVehicleRepository _repository;
        public CreateVehicleCommandHandler(IVehicleRepository repository)
        {
            _repository = repository;
        }
        public Task<Vehicle> Handle(CreateVehicleCommand request, CancellationToken cancellationToken)
        {
            var entity = new Vehicle
            {
                Id = System.Guid.NewGuid(),
                Registration = request.RegistrationNumber,
                Make = request.Make,
                Model = request.Model,
                Year = request.Year,
                Status = request.State
            };
            _repository.Add(entity);
            return Task.FromResult(entity);
        }
    }
}
