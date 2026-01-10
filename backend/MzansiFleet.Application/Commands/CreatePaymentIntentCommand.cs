using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Commands
{
    public class CreatePaymentIntentCommand : IRequest<PaymentIntent>
    {
        public Guid PayerId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; }
        public string State { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
