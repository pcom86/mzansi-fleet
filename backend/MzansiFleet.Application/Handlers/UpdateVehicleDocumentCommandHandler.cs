using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class UpdateVehicleDocumentCommandHandler : IRequestHandler<UpdateVehicleDocumentCommand, VehicleDocument>
    {
        private readonly IVehicleDocumentRepository _repository;
        public UpdateVehicleDocumentCommandHandler(IVehicleDocumentRepository repository)
        {
            _repository = repository;
        }
        public Task<VehicleDocument> Handle(UpdateVehicleDocumentCommand request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            if (entity == null) return Task.FromResult<VehicleDocument>(null);
            entity.VehicleId = request.VehicleId;
            entity.DocumentType = request.DocumentType;
            entity.FileUrl = request.FileUrl;
            entity.UploadedAt = request.UploadedAt;
            _repository.Update(entity);
            return Task.FromResult(entity);
        }
    }
}

