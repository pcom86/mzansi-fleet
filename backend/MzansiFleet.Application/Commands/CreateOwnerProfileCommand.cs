using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Commands
{
    public class CreateOwnerProfileCommand : IRequest<OwnerProfile>
    {
        public Guid UserId { get; set; }
        public string CompanyName { get; set; }
        public string Address { get; set; }
        public string ContactName { get; set; }
        public string ContactEmail { get; set; }
        public string ContactPhone { get; set; }
    }
}
