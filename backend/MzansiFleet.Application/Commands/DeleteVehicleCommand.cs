using System;
using MediatR;

namespace MzansiFleet.Application.Commands
{
    public class DeleteVehicleCommand : IRequest<bool>
    {
        public Guid Id { get; set; }
    }
}

