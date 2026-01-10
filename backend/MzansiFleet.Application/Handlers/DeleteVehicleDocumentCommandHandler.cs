using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class DeleteVehicleDocumentCommandHandler : IRequestHandler<DeleteVehicleDocumentCommand, bool>
    {
        private readonly IVehicleDocumentRepository _repository;
        public DeleteVehicleDocumentCommandHandler(IVehicleDocumentRepository repository)
        {
            _repository = repository;
        }
        public Task<bool> Handle(DeleteVehicleDocumentCommand request, CancellationToken cancellationToken)
        {
            _repository.Delete(request.Id);
            return Task.FromResult(true);
        }
    }
}

