using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Commands
{
    public class UpdateReviewCommand : IRequest<Review>
    {
        public Guid Id { get; set; }
        public Guid ReviewerId { get; set; }
        public Guid TargetId { get; set; }
        public string TargetType { get; set; }
        public int Rating { get; set; }
        public string Comments { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}

