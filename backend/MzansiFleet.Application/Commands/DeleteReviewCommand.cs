using System;
using MediatR;

namespace MzansiFleet.Application.Commands
{
    public class DeleteReviewCommand : IRequest<bool>
    {
        public Guid Id { get; set; }
    }
}

