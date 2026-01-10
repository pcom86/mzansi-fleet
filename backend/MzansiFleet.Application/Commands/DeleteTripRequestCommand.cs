using System;
using MediatR;

namespace MzansiFleet.Application.Commands
{
    public class DeleteTripRequestCommand : IRequest<bool>
    {
        public Guid Id { get; set; }
    }
}

