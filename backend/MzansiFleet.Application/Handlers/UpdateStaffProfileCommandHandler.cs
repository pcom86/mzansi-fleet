using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class UpdateStaffProfileCommandHandler : IRequestHandler<UpdateStaffProfileCommand, StaffProfile>
    {
        private readonly IStaffProfileRepository _repository;
        public UpdateStaffProfileCommandHandler(IStaffProfileRepository repository)
        {
            _repository = repository;
        }
        public Task<StaffProfile> Handle(UpdateStaffProfileCommand request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            if (entity == null) return Task.FromResult<StaffProfile>(null);
            entity.UserId = request.UserId;
            entity.Role = request.Role;
            _repository.Update(entity);
            return Task.FromResult(entity);
        }
    }
}

