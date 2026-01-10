using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class UpdateTenantCommandHandler : IRequestHandler<UpdateTenantCommand, Tenant>
    {
        private readonly ITenantRepository _repository;
        public UpdateTenantCommandHandler(ITenantRepository repository)
        {
            _repository = repository;
        }
        public Task<Tenant> Handle(UpdateTenantCommand request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            if (entity == null) return Task.FromResult<Tenant>(null);
            entity.Name = request.Name;
            entity.ContactEmail = request.ContactEmail;
            entity.ContactPhone = request.ContactPhone;
            _repository.Update(entity);
            return Task.FromResult(entity);
        }
    }
}

