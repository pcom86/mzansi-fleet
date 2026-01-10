using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class CreateMechanicalRequestCommandHandler : IRequestHandler<CreateMechanicalRequestCommand, MechanicalRequest>
    {
        private readonly IMechanicalRequestRepository _repository;
        public CreateMechanicalRequestCommandHandler(IMechanicalRequestRepository repository)
        {
            _repository = repository;
        }
        public Task<MechanicalRequest> Handle(CreateMechanicalRequestCommand request, CancellationToken cancellationToken)
        {
            var entity = new MechanicalRequest
            {
                Id = System.Guid.NewGuid(),
                OwnerId = request.OwnerId,
                VehicleId = request.VehicleId,
                Location = request.Location,
                Category = request.Category,
                Description = request.Description,
                MediaUrls = request.MediaUrls,
                PreferredTime = request.PreferredTime,
                CallOutRequired = request.CallOutRequired,
                State = request.State,
                Priority = request.Priority,
                RequestedBy = request.RequestedBy,
                RequestedByType = request.RequestedByType,
                CreatedAt = System.DateTime.UtcNow
            };
            _repository.Add(entity);
            return Task.FromResult(entity);
        }
    }
}
