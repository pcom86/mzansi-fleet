using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class CreateVehicleDocumentCommandHandler : IRequestHandler<CreateVehicleDocumentCommand, VehicleDocument>
    {
        private readonly IVehicleDocumentRepository _repository;
        public CreateVehicleDocumentCommandHandler(IVehicleDocumentRepository repository)
        {
            _repository = repository;
        }
        public Task<VehicleDocument> Handle(CreateVehicleDocumentCommand request, CancellationToken cancellationToken)
        {
            var entity = new VehicleDocument
            {
                Id = System.Guid.NewGuid(),
                VehicleId = request.VehicleId,
                DocumentType = request.DocumentType,
                FileUrl = request.FileUrl,
                UploadedAt = request.UploadedAt
            };
            _repository.Add(entity);
            return Task.FromResult(entity);
        }
    }
}

