using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Queries
{
    public class GetPaymentIntentByIdQuery : IRequest<PaymentIntent>
    {
        public Guid Id { get; set; }
    }
}

