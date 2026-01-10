using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class DeleteVehicleCommandHandler : IRequestHandler<DeleteVehicleCommand, bool>
    {
        private readonly IVehicleRepository _repository;
        public DeleteVehicleCommandHandler(IVehicleRepository repository)
        {
            _repository = repository;
        }
        public Task<bool> Handle(DeleteVehicleCommand request, CancellationToken cancellationToken)
        {
            _repository.Delete(request.Id);
            return Task.FromResult(true);
        }
    }
}

