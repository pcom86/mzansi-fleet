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
            
            // Get user's full name based on role
            string fullName = null;
            try
            {
                if (user.Role == "Owner")
                {
                    var ownerProfile = _context.Set<Domain.Entities.OwnerProfile>()
                        .FirstOrDefault(o => o.UserId == user.Id);
                    fullName = ownerProfile?.ContactName;
                }
                else if (user.Role == "Driver")
                {
                    var driverProfile = _context.Set<Domain.Entities.DriverProfile>()
                        .FirstOrDefault(d => d.UserId == user.Id);
                    fullName = driverProfile?.Name;
                }
                else if (user.Role == "Customer")
                {
                    var passengerProfile = _context.Set<Domain.Entities.PassengerProfile>()
                        .FirstOrDefault(p => p.UserId == user.Id);
                    fullName = passengerProfile?.Name;
                }
                else if (user.Role == "ServiceProvider")
                {
                    var providerProfile = _context.Set<Domain.Entities.ServiceProviderProfile>()
                        .FirstOrDefault(sp => sp.UserId == user.Id);
                    fullName = providerProfile?.ContactPerson;
                }
                else if (user.Role == "TaxiRankAdmin")
                {
                    var adminProfile = _context.Set<Domain.Entities.TaxiRankAdminProfile>()
                        .FirstOrDefault(a => a.UserId == user.Id);
                    fullName = adminProfile?.FullName;
                }
                else if (user.Role == "TaxiMarshal")
                {
                    var marshalProfile = _context.Set<Domain.Entities.TaxiMarshalProfile>()
                        .FirstOrDefault(m => m.UserId == user.Id);
                    fullName = marshalProfile?.FullName;
                }
            }
            catch { /* Ignore profile lookup errors */ }
            
            return new LoginResponseDto
            {
                Token = token,
                UserId = user.Id,
                Email = user.Email,
                Role = user.Role,
                TenantId = user.TenantId,
                ExpiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes),
                FullName = fullName
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
                new Claim("userId", user.Id.ToString()),
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
