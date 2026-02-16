#nullable enable
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Repository;
using System;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public AuthController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterUserDto dto)
        {
            try
            {
                // Validate input
                if (string.IsNullOrEmpty(dto.Email) || string.IsNullOrEmpty(dto.Password))
                {
                    return BadRequest(new { message = "Email and password are required" });
                }

                // Check if user already exists
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower());

                if (existingUser != null)
                {
                    return Conflict(new { message = "An account with this email already exists" });
                }

                // Create tenant for the user (required for user structure)
                var tenant = new Tenant
                {
                    Id = Guid.NewGuid(),
                    Name = dto.FullName ?? dto.Email,
                    ContactEmail = dto.Email,
                    ContactPhone = dto.Phone ?? "",
                    Code = GenerateTenantCode(),
                    TenantType = "Individual Customer"
                };

                _context.Tenants.Add(tenant);

                // Hash the password using BCrypt (matching the login system)
                string hashedPassword = BCrypt.Net.BCrypt.HashPassword(dto.Password);

                // Create user
                var user = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Email = dto.Email,
                    Phone = dto.Phone ?? "",
                    PasswordHash = hashedPassword,
                    Role = dto.Role ?? "Customer", // Default to Customer role
                    IsActive = dto.IsActive ?? true // Normal users are active by default
                };

                _context.Users.Add(user);

                // Create passenger profile for Customer role
                if (user.Role == "Customer")
                {
                    var passengerProfile = new Domain.Entities.PassengerProfile
                    {
                        Id = Guid.NewGuid(),
                        UserId = user.Id,
                        Name = dto.FullName ?? dto.Email,
                        Phone = dto.Phone ?? "",
                        Email = dto.Email
                    };
                    _context.Set<Domain.Entities.PassengerProfile>().Add(passengerProfile);
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "User registered successfully",
                    userId = user.Id,
                    email = user.Email,
                    fullName = dto.FullName,
                    role = user.Role
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred during registration", detail = ex.Message });
            }
        }

        private string GenerateTenantCode()
        {
            return $"TNT-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";
        }
    }

    public class RegisterUserDto
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? FullName { get; set; }
        public string? IdNumber { get; set; }
        public string? Role { get; set; }
        public bool? IsActive { get; set; }
    }
}
