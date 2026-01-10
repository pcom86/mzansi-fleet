using System;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.DTOs;
using MzansiFleet.Repository;

namespace MzansiFleet.Application.Handlers
{
    public class LoginCommandHandler
    {
        private readonly MzansiFleetDbContext _context;
        private readonly IConfiguration _configuration;

        public LoginCommandHandler(MzansiFleetDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public LoginResponseDto Handle(LoginCommand command, CancellationToken cancellationToken)
        {
            // Find user by email
            var user = _context.Users.FirstOrDefault(u => u.Email == command.Email);
            
            if (user == null)
            {
                throw new UnauthorizedAccessException("Invalid email or password");
            }

            // Verify password - try BCrypt first, then fall back to SHA256 for old accounts
            bool passwordValid = false;
            bool needsRehash = false;

            try
            {
                // Try BCrypt verification (for new accounts)
                passwordValid = BCrypt.Net.BCrypt.Verify(command.Password, user.PasswordHash);
            }
            catch
            {
                // If BCrypt fails, try SHA256 (for old accounts created before BCrypt implementation)
                var sha256Hash = HashPasswordSHA256(command.Password);
                if (user.PasswordHash == sha256Hash)
                {
                    passwordValid = true;
                    needsRehash = true; // Mark for rehashing to BCrypt
                }
            }

            if (!passwordValid)
            {
                throw new UnauthorizedAccessException("Invalid email or password");
            }

            // Rehash old SHA256 passwords to BCrypt
            if (needsRehash)
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(command.Password);
                _context.SaveChanges();
            }

            // Check if user is active
            if (!user.IsActive)
            {
                throw new UnauthorizedAccessException("User account is inactive");
            }

            // Generate JWT token
            var token = GenerateJwtToken(user);
            var expirationMinutes = int.Parse(_configuration["JwtSettings:ExpirationMinutes"] ?? "1440");
            
            return new LoginResponseDto
            {
                Token = token,
                UserId = user.Id,
                Email = user.Email,
                Role = user.Role,
                TenantId = user.TenantId,
                ExpiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes)
            };
        }

        private string GenerateJwtToken(Domain.Entities.User user)
        {
            var secretKey = _configuration["JwtSettings:SecretKey"];
            var issuer = _configuration["JwtSettings:Issuer"];
            var audience = _configuration["JwtSettings:Audience"];
            var expirationMinutes = int.Parse(_configuration["JwtSettings:ExpirationMinutes"] ?? "1440");

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? ""),
                new Claim(ClaimTypes.Role, user.Role ?? "User"),
                new Claim("tenant_id", user.TenantId.ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private string HashPasswordSHA256(string password)
        {
            // SHA256 hash for backward compatibility with old accounts
            using (var sha256 = SHA256.Create())
            {
                var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
                return Convert.ToBase64String(hashedBytes);
            }
        }
    }

    public class LogoutCommandHandler
    {
        private readonly MzansiFleetDbContext _context;

        public LogoutCommandHandler(MzansiFleetDbContext context)
        {
            _context = context;
        }

        public bool Handle(LogoutCommand command, CancellationToken cancellationToken)
        {
            // In a production environment, you would:
            // 1. Invalidate the token in a blacklist/cache
            // 2. Log the logout event
            // 3. Update user's last logout timestamp
            
            // For now, we'll just return success
            // The client should remove the token from storage
            return true;
        }
    }
}
