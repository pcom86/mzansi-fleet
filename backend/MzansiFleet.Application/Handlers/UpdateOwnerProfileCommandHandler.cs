using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class UpdateOwnerProfileCommandHandler : IRequestHandler<UpdateOwnerProfileCommand, OwnerProfile>
    {
        private readonly IOwnerProfileRepository _repository;
        public UpdateOwnerProfileCommandHandler(IOwnerProfileRepository repository)
        {
            _repository = repository;
        }
        public Task<OwnerProfile> Handle(UpdateOwnerProfileCommand request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            if (entity == null) return Task.FromResult<OwnerProfile>(null);
            entity.UserId = request.UserId;
            entity.CompanyName = request.CompanyName;
            entity.Address = request.Address;
            entity.ContactName = request.ContactName;
            entity.ContactPhone = request.ContactPhone;
            entity.ContactEmail = request.ContactEmail;
            _repository.Update(entity);
            return Task.FromResult(entity);
        }
    }
}

