using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Queries
{
    public class GetMechanicalRequestByIdQuery : IRequest<MechanicalRequest>
    {
        public Guid Id { get; set; }
    }
}

