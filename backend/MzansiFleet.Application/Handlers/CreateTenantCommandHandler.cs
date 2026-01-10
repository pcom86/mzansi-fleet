using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class CreateTenantCommandHandler : IRequestHandler<CreateTenantCommand, Tenant>
    {
        private readonly ITenantRepository _repository;
        public CreateTenantCommandHandler(ITenantRepository repository)
        {
            _repository = repository;
        }
        public Task<Tenant> Handle(CreateTenantCommand request, CancellationToken cancellationToken)
        {
            var entity = new Tenant
            {
                Id = request.Id ?? System.Guid.NewGuid(),  // Use provided ID or generate new one
                Name = request.Name,
                Code = request.Code,
                ContactEmail = request.ContactEmail,
                ContactPhone = request.ContactPhone,
                Users = new List<User>()
            };
            _repository.Add(entity);
            return Task.FromResult(entity);
        }
    }
}
