using System;
using MediatR;

namespace MzansiFleet.Application.Commands
{
    public class DeletePaymentIntentCommand : IRequest<bool>
    {
        public Guid Id { get; set; }
    }
}

