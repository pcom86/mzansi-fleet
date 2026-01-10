using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Queries
{
    public class GetTenantByIdQuery : IRequest<Tenant>
    {
        public Guid Id { get; set; }
    }
}

