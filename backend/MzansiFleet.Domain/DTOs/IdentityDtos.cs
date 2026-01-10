using System;
using System.Collections.Generic;

namespace MzansiFleet.Domain.DTOs
{
    public class TenantDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string ContactEmail { get; set; }
        public string ContactPhone { get; set; }
    }
    public class UserDto
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string PasswordHash { get; set; }
        public string Role { get; set; }
        public bool IsActive { get; set; }
    }
    public class OwnerProfileDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string CompanyName { get; set; }
        public string Address { get; set; }
        public string ContactName { get; set; }
        public string ContactPhone { get; set; }
        public string ContactEmail { get; set; }
    }

    public class LoginRequestDto
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }

    public class LoginResponseDto
    {
        public string Token { get; set; }
        public Guid UserId { get; set; }
        public string Email { get; set; }
        public string Role { get; set; }
        public Guid TenantId { get; set; }
        public DateTime ExpiresAt { get; set; }
    }

    public class LogoutRequestDto
    {
        public string Token { get; set; }
    }
}

