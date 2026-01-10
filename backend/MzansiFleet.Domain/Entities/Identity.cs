using System;
using System.Collections.Generic;

namespace MzansiFleet.Domain.Entities
{
    public class Tenant
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;  // Unique tenant code for registration
        public string ContactEmail { get; set; } = string.Empty;
        public string ContactPhone { get; set; } = string.Empty;
        public ICollection<User> Users { get; set; } = new List<User>();
    }

    public class User
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // See MzansiFleet.Domain.Constants.Roles for valid roles: Owner, Driver, Staff, ServiceProvider, TaxiRankAdmin, TaxiMarshal, etc.
        public bool IsActive { get; set; }
        public Tenant Tenant { get; set; } = null!;
    }

    public class OwnerProfile
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string ContactName { get; set; } = string.Empty;
        public string ContactPhone { get; set; } = string.Empty;
        public string ContactEmail { get; set; } = string.Empty;
        public User? User { get; set; }
    }
}

