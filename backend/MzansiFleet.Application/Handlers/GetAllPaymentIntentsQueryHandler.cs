using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Queries;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Application.Handlers
{
    public class GetAllPaymentIntentsQueryHandler : IRequestHandler<GetAllPaymentIntentsQuery, IEnumerable<PaymentIntent>>
    {
        private readonly IPaymentIntentRepository _repository;
        public GetAllPaymentIntentsQueryHandler(IPaymentIntentRepository repository)
        {
            _repository = repository;
        }
        public Task<IEnumerable<PaymentIntent>> Handle(GetAllPaymentIntentsQuery request, CancellationToken cancellationToken)
        {
            var entities = _repository.GetAll();
            return Task.FromResult(entities);
        }
    }
}

