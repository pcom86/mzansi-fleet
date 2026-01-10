using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class DeleteTripRequestCommandHandler : IRequestHandler<DeleteTripRequestCommand, bool>
    {
        private readonly ITripRequestRepository _repository;
        public DeleteTripRequestCommandHandler(ITripRequestRepository repository)
        {
            _repository = repository;
        }
        public Task<bool> Handle(DeleteTripRequestCommand request, CancellationToken cancellationToken)
        {
            _repository.Delete(request.Id);
            return Task.FromResult(true);
        }
    }
}

