using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class CreateStaffProfileCommandHandler : IRequestHandler<CreateStaffProfileCommand, StaffProfile>
    {
        private readonly IStaffProfileRepository _repository;
        public CreateStaffProfileCommandHandler(IStaffProfileRepository repository)
        {
            _repository = repository;
        }
        public Task<StaffProfile> Handle(CreateStaffProfileCommand request, CancellationToken cancellationToken)
        {
            var entity = new StaffProfile
            {
                Id = System.Guid.NewGuid(),
                UserId = request.UserId,
                Role = request.Role
            };
            _repository.Add(entity);
            return Task.FromResult(entity);
        }
    }
}
