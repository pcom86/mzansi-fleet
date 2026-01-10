using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Commands
{
    public class CreateTenantCommand : IRequest<Tenant>
    {
        public Guid? Id { get; set; }  // Optional - if not provided, will be generated
        public string Name { get; set; }
        public string Code { get; set; }  // Unique tenant code
        public string ContactEmail { get; set; }
        public string ContactPhone { get; set; }
    }
}
