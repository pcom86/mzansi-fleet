using System;
using MediatR;

namespace MzansiFleet.Application.Commands
{
    public class DeleteVehicleDocumentCommand : IRequest<bool>
    {
        public Guid Id { get; set; }
    }
}

