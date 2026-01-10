using System;

namespace MzansiFleet.Domain.DTOs
{
    public class ReviewDto
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

