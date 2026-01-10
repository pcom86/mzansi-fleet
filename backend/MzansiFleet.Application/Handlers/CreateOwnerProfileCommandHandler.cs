using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class CreateOwnerProfileCommandHandler : IRequestHandler<CreateOwnerProfileCommand, OwnerProfile>
    {
        private readonly IOwnerProfileRepository _repository;
        public CreateOwnerProfileCommandHandler(IOwnerProfileRepository repository)
        {
            _repository = repository;
        }
        public Task<OwnerProfile> Handle(CreateOwnerProfileCommand request, CancellationToken cancellationToken)
        {
            var entity = new OwnerProfile
            {
                Id = System.Guid.NewGuid(),
                UserId = request.UserId,
                CompanyName = request.CompanyName,
                Address = request.Address,
                ContactName = request.ContactName,
                ContactPhone = request.ContactPhone,
                ContactEmail = request.ContactEmail
            };
            _repository.Add(entity);
            return Task.FromResult(entity);
        }
    }
}
