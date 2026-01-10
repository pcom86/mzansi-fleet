using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetMechanicalRequestByIdQueryHandler : IRequestHandler<GetMechanicalRequestByIdQuery, MechanicalRequest>
    {
        private readonly IMechanicalRequestRepository _repository;
        public GetMechanicalRequestByIdQueryHandler(IMechanicalRequestRepository repository)
        {
            _repository = repository;
        }
        public Task<MechanicalRequest> Handle(GetMechanicalRequestByIdQuery request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            return Task.FromResult(entity);
        }
    }
}

