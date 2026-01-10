using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetVehicleDocumentByIdQueryHandler : IRequestHandler<GetVehicleDocumentByIdQuery, VehicleDocument>
    {
        private readonly IVehicleDocumentRepository _repository;
        public GetVehicleDocumentByIdQueryHandler(IVehicleDocumentRepository repository)
        {
            _repository = repository;
        }
        public Task<VehicleDocument> Handle(GetVehicleDocumentByIdQuery request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            return Task.FromResult(entity);
        }
    }
}

