using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class DeletePaymentIntentCommandHandler : IRequestHandler<DeletePaymentIntentCommand, bool>
    {
        private readonly IPaymentIntentRepository _repository;
        public DeletePaymentIntentCommandHandler(IPaymentIntentRepository repository)
        {
            _repository = repository;
        }
        public Task<bool> Handle(DeletePaymentIntentCommand request, CancellationToken cancellationToken)
        {
            _repository.Delete(request.Id);
            return Task.FromResult(true);
        }
    }
}

