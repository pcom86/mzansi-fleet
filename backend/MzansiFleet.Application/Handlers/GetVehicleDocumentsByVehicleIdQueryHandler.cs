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
    public class GetVehicleDocumentsByVehicleIdQueryHandler : IRequestHandler<GetVehicleDocumentsByVehicleIdQuery, IEnumerable<VehicleDocument>>
    {
        private readonly IVehicleDocumentRepository _repository;

        public GetVehicleDocumentsByVehicleIdQueryHandler(IVehicleDocumentRepository repository)
        {
            _repository = repository;
        }

        public Task<IEnumerable<VehicleDocument>> Handle(GetVehicleDocumentsByVehicleIdQuery request, CancellationToken cancellationToken)
        {
            IEnumerable<VehicleDocument> documents = _repository.GetAll()
                .Where(d => d.VehicleId == request.VehicleId)
                .OrderByDescending(d => d.UploadedAt);
            
            return Task.FromResult(documents);
        }
    }
}
