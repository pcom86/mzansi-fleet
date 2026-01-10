using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetOwnerProfileByIdQueryHandler : IRequestHandler<GetOwnerProfileByIdQuery, OwnerProfile>
    {
        private readonly IOwnerProfileRepository _repository;
        public GetOwnerProfileByIdQueryHandler(IOwnerProfileRepository repository)
        {
            _repository = repository;
        }
        public Task<OwnerProfile> Handle(GetOwnerProfileByIdQuery request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            return Task.FromResult(entity);
        }
    }
}

