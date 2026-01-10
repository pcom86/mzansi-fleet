using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class CreatePaymentIntentCommandHandler : IRequestHandler<CreatePaymentIntentCommand, PaymentIntent>
    {
        private readonly IPaymentIntentRepository _repository;
        public CreatePaymentIntentCommandHandler(IPaymentIntentRepository repository)
        {
            _repository = repository;
        }
        public Task<PaymentIntent> Handle(CreatePaymentIntentCommand request, CancellationToken cancellationToken)
        {
            var entity = new PaymentIntent
            {
                Id = System.Guid.NewGuid(),
                PayerId = request.PayerId,
                Amount = request.Amount,
                Currency = request.Currency,
                State = request.State,
                CreatedAt = request.CreatedAt
            };
            _repository.Add(entity);
            return Task.FromResult(entity);
        }
    }
}
