using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetAllStaffProfilesQueryHandler : IRequestHandler<GetAllStaffProfilesQuery, IEnumerable<StaffProfile>>
    {
        private readonly IStaffProfileRepository _repository;
        public GetAllStaffProfilesQueryHandler(IStaffProfileRepository repository)
        {
            _repository = repository;
        }
        public Task<IEnumerable<StaffProfile>> Handle(GetAllStaffProfilesQuery request, CancellationToken cancellationToken)
        {
            var entities = _repository.GetAll();
            return Task.FromResult(entities);
        }
    }
}

