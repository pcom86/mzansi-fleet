using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Commands
{
    public class CreateVehicleDocumentCommand : IRequest<VehicleDocument>
    {
        public Guid VehicleId { get; set; }
        public string DocumentType { get; set; }
        public string FileUrl { get; set; }
        public DateTime UploadedAt { get; set; }
    }
}

