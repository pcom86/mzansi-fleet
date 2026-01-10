using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Commands
{
    public class UpdateVehicleDocumentCommand : IRequest<VehicleDocument>
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public string DocumentType { get; set; }
        public string FileUrl { get; set; }
        public DateTime UploadedAt { get; set; }
    }
}

