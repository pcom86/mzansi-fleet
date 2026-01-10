using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetPaymentIntentByIdQueryHandler : IRequestHandler<GetPaymentIntentByIdQuery, PaymentIntent>
    {
        private readonly IPaymentIntentRepository _repository;
        public GetPaymentIntentByIdQueryHandler(IPaymentIntentRepository repository)
        {
            _repository = repository;
        }
        public Task<PaymentIntent> Handle(GetPaymentIntentByIdQuery request, CancellationToken cancellationToken)
        {
            var entity = _repository.GetById(request.Id);
            return Task.FromResult(entity);
        }
    }
}

