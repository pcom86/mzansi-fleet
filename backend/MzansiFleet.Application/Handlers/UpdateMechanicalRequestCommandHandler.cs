using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class UpdateMechanicalRequestCommandHandler : IRequestHandler<UpdateMechanicalRequestCommand, MechanicalRequest>
    {
        private readonly IMechanicalRequestRepository _repository;
        public UpdateMechanicalRequestCommandHandler(IMechanicalRequestRepository repository)
        {
            _repository = repository;
        }
        public Task<MechanicalRequest> Handle(UpdateMechanicalRequestCommand request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            if (entity == null) return Task.FromResult<MechanicalRequest>(null);
            entity.OwnerId = request.OwnerId;
            entity.VehicleId = request.VehicleId;
            entity.Location = request.Location;
            entity.Category = request.Category;
            entity.Description = request.Description;
            entity.MediaUrls = request.MediaUrls;
            entity.PreferredTime = request.PreferredTime;
            entity.CallOutRequired = request.CallOutRequired;
            entity.State = request.State;
            _repository.Update(entity);
            return Task.FromResult(entity);
        }
    }
}

