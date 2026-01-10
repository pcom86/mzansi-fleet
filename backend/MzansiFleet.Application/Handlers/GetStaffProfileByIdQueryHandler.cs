using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetStaffProfileByIdQueryHandler : IRequestHandler<GetStaffProfileByIdQuery, StaffProfile>
    {
        private readonly IStaffProfileRepository _repository;
        public GetStaffProfileByIdQueryHandler(IStaffProfileRepository repository)
        {
            _repository = repository;
        }
        public Task<StaffProfile> Handle(GetStaffProfileByIdQuery request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            return Task.FromResult(entity);
        }
    }
}

