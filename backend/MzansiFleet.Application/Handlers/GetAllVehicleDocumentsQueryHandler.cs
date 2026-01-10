using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetAllVehicleDocumentsQueryHandler : IRequestHandler<GetAllVehicleDocumentsQuery, IEnumerable<VehicleDocument>>
    {
        private readonly IVehicleDocumentRepository _repository;
        public GetAllVehicleDocumentsQueryHandler(IVehicleDocumentRepository repository)
        {
            _repository = repository;
        }
        public Task<IEnumerable<VehicleDocument>> Handle(GetAllVehicleDocumentsQuery request, CancellationToken cancellationToken)
        {
            var entities = _repository.GetAll();
            return Task.FromResult(entities);
        }
    }
}

