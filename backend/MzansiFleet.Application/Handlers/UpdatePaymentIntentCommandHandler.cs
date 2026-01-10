using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class UpdatePaymentIntentCommandHandler : IRequestHandler<UpdatePaymentIntentCommand, PaymentIntent>
    {
        private readonly IPaymentIntentRepository _repository;
        public UpdatePaymentIntentCommandHandler(IPaymentIntentRepository repository)
        {
            _repository = repository;
        }
        public Task<PaymentIntent> Handle(UpdatePaymentIntentCommand request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            if (entity == null) return Task.FromResult<PaymentIntent>(null);
            entity.PayerId = request.PayerId;
            entity.Amount = request.Amount;
            entity.Currency = request.Currency;
            entity.State = request.State;
            entity.CreatedAt = request.CreatedAt;
            _repository.Update(entity);
            return Task.FromResult(entity);
        }
    }
}

