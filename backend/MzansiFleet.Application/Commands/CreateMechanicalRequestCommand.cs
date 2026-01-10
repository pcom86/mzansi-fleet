using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Commands
{
    public class CreateMechanicalRequestCommand : IRequest<MechanicalRequest>
    {
        public Guid OwnerId { get; set; }
        public Guid? VehicleId { get; set; }
        public string Location { get; set; }
        public string Category { get; set; }
        public string Description { get; set; }
        public string MediaUrls { get; set; }
        public DateTime? PreferredTime { get; set; }
        public bool CallOutRequired { get; set; }
        public string State { get; set; }
        public string Priority { get; set; }
        public Guid? RequestedBy { get; set; }
        public string RequestedByType { get; set; }
    }
}
