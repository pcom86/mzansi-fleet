using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class DeleteMechanicalRequestCommandHandler : IRequestHandler<DeleteMechanicalRequestCommand, bool>
    {
        private readonly IMechanicalRequestRepository _repository;
        public DeleteMechanicalRequestCommandHandler(IMechanicalRequestRepository repository)
        {
            _repository = repository;
        }
        public Task<bool> Handle(DeleteMechanicalRequestCommand request, CancellationToken cancellationToken)
        {
            _repository.Delete(request.Id);
            return Task.FromResult(true);
        }
    }
}

