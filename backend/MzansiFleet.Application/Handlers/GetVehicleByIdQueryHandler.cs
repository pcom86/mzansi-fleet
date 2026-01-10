using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetVehicleByIdQueryHandler : IRequestHandler<GetVehicleByIdQuery, Vehicle>
    {
        private readonly IVehicleRepository _repository;
        public GetVehicleByIdQueryHandler(IVehicleRepository repository)
        {
            _repository = repository;
        }
        public Task<Vehicle> Handle(GetVehicleByIdQuery request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            return Task.FromResult(entity);
        }
    }
}

