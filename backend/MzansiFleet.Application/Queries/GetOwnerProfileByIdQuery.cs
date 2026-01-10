using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Queries
{
    public class GetOwnerProfileByIdQuery : IRequest<OwnerProfile>
    {
        public Guid Id { get; set; }
    }
}

