using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class DeleteOwnerProfileCommandHandler : IRequestHandler<DeleteOwnerProfileCommand, bool>
    {
        private readonly IOwnerProfileRepository _repository;
        public DeleteOwnerProfileCommandHandler(IOwnerProfileRepository repository)
        {
            _repository = repository;
        }
        public Task<bool> Handle(DeleteOwnerProfileCommand request, CancellationToken cancellationToken)
        {
            _repository.Delete(request.Id);
            return Task.FromResult(true);
        }
    }
}

