using System;

namespace MzansiFleet.Domain.Entities
{
    public class Review
    {
        public Guid Id { get; set; }
        public Guid ReviewerId { get; set; }
        public Guid TargetId { get; set; }
        public string TargetType { get; set; } // Driver, Vehicle, etc.
        public int Rating { get; set; }
        public string Comments { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}

