using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Queries
{
    public class GetStaffProfileByIdQuery : IRequest<StaffProfile>
    {
        public Guid Id { get; set; }
    }
}

