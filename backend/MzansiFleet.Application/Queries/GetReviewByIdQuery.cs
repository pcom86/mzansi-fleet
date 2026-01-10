using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Queries
{
    public class GetReviewByIdQuery : IRequest<Review>
    {
        public Guid Id { get; set; }
    }
}

