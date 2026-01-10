using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetAllVehiclesQueryHandler : IRequestHandler<GetAllVehiclesQuery, IEnumerable<Vehicle>>
    {
        private readonly IVehicleRepository _repository;
        public GetAllVehiclesQueryHandler(IVehicleRepository repository)
        {
            _repository = repository;
        }
        public Task<IEnumerable<Vehicle>> Handle(GetAllVehiclesQuery request, CancellationToken cancellationToken)
        {
            var entities = _repository.GetAll();
            return Task.FromResult(entities);
        }
    }
}
