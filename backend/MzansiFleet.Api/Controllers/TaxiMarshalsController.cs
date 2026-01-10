using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Domain.Constants;
using MzansiFleet.Repository;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TaxiRankUsersController : ControllerBase
    {
        private readonly ITaxiMarshalRepository _marshalRepository;
        private readonly ITaxiRankAdminRepository _adminRepository;
        private readonly IUserRepository _userRepository;
        private readonly MzansiFleetDbContext _context;

        public TaxiRankUsersController(
            ITaxiMarshalRepository marshalRepository,
            ITaxiRankAdminRepository adminRepository,
            IUserRepository userRepository,
            MzansiFleetDbContext context)
        {
            _marshalRepository = marshalRepository;
            _adminRepository = adminRepository;
            _userRepository = userRepository;
            _context = context;
        }

        // GET: api/TaxiRankUsers/marshals
        [HttpGet("marshals")]
        public async Task<ActionResult<IEnumerable<TaxiMarshalProfile>>> GetAll([FromQuery] Guid? tenantId = null)
        {
            if (tenantId.HasValue)
            {
                var marshals = await _marshalRepository.GetByTenantIdAsync(tenantId.Value);
                return Ok(marshals);
            }
            
            var allMarshals = await _marshalRepository.GetAllAsync();
            return Ok(allMarshals);
        }

        // GET: api/TaxiRankUsers/marshals/{id}
        [HttpGet("marshals/{id}")]
        public async Task<ActionResult<TaxiMarshalProfile>> GetById(Guid id)
        {
            var marshal = await _marshalRepository.GetByIdAsync(id);
            if (marshal == null)
                return NotFound();

            return Ok(marshal);
        }

        // GET: api/TaxiRankUsers/marshals/user/{userId}
        [HttpGet("marshals/user/{userId}")]
        public async Task<ActionResult<TaxiMarshalProfile>> GetByUserId(Guid userId)
        {
            var marshal = await _marshalRepository.GetByUserIdAsync(userId);
            if (marshal == null)
                return NotFound();

            return Ok(marshal);
        }

        // GET: api/TaxiRankUsers/marshals/code/{marshalCode}
        [HttpGet("marshals/code/{marshalCode}")]
        public async Task<ActionResult<TaxiMarshalProfile>> GetByMarshalCode(string marshalCode)
        {
            var marshal = await _marshalRepository.GetByMarshalCodeAsync(marshalCode);
            if (marshal == null)
                return NotFound();

            return Ok(marshal);
        }

        // POST: api/TaxiRankUsers/register
        [HttpPost("register")]
        public async Task<ActionResult<TaxiRankUserRegistrationResponse>> Register([FromBody] RegisterTaxiRankUserDto dto)
        {
            try
            {
                // Validate role
                if (dto.Role != Roles.TaxiRankAdmin && dto.Role != Roles.TaxiMarshal)
                {
                    return BadRequest(new { message = "Invalid role. Must be TaxiRankAdmin or TaxiMarshal" });
                }

                // Validate tenant
                var tenant = await _context.Tenants.FindAsync(dto.TenantId);
                if (tenant == null)
                    return BadRequest(new { message = "Invalid tenant" });

                // Validate taxi rank
                var taxiRank = await _context.TaxiRanks.FindAsync(dto.TaxiRankId);
                if (taxiRank == null)
                    return BadRequest(new { message = "Invalid taxi rank" });

                // Check if email already exists
                var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
                if (existingUser != null)
                {
                    return BadRequest(new { message = "Email already registered" });
                }

                // Check if user code already exists
                if (dto.Role == Roles.TaxiMarshal)
                {
                    var existingMarshal = await _marshalRepository.GetByMarshalCodeAsync(dto.UserCode);
                    if (existingMarshal != null)
                        return BadRequest(new { message = "User code already in use" });
                }
                else // TaxiRankAdmin
                {
                    var existingAdmin = await _adminRepository.GetByAdminCodeAsync(dto.UserCode);
                    if (existingAdmin != null)
                        return BadRequest(new { message = "User code already in use" });
                }

                // Create User account
                var userId = Guid.NewGuid();
                var user = new User
                {
                    Id = userId,
                    TenantId = dto.TenantId,
                    Email = dto.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                    Role = dto.Role,
                    IsActive = true
                };

                _userRepository.Add(user);

                Guid profileId;
                string profileType;

                // Create profile based on role
                if (dto.Role == Roles.TaxiMarshal)
                {
                    var marshalProfile = new TaxiMarshalProfile
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        TenantId = dto.TenantId,
                        TaxiRankId = dto.TaxiRankId,
                        MarshalCode = dto.UserCode,
                        FullName = dto.FullName,
                        PhoneNumber = dto.PhoneNumber,
                        Email = dto.Email,
                        HireDate = dto.HireDate ?? DateTime.UtcNow,
                        Status = "Active",
                        IdNumber = dto.IdNumber,
                        Address = dto.Address,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _marshalRepository.AddAsync(marshalProfile);
                    profileId = marshalProfile.Id;
                    profileType = "TaxiMarshal";
                }
                else // TaxiRankAdmin
                {
                    var adminProfile = new TaxiRankAdminProfile
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        TenantId = dto.TenantId,
                        TaxiRankId = dto.TaxiRankId,
                        AdminCode = dto.UserCode,
                        FullName = dto.FullName,
                        PhoneNumber = dto.PhoneNumber,
                        Email = dto.Email,
                        HireDate = dto.HireDate ?? DateTime.UtcNow,
                        Status = "Active",
                        IdNumber = dto.IdNumber,
                        Address = dto.Address,
                        CanManageMarshals = dto.CanManageMarshals ?? true,
                        CanManageVehicles = dto.CanManageVehicles ?? true,
                        CanManageSchedules = dto.CanManageSchedules ?? true,
                        CanViewReports = dto.CanViewReports ?? true,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _adminRepository.AddAsync(adminProfile);
                    profileId = adminProfile.Id;
                    profileType = "TaxiRankAdmin";
                }

                return Ok(new TaxiRankUserRegistrationResponse
                {
                    Success = true,
                    Message = $"{profileType} registered successfully",
                    UserId = userId,
                    ProfileId = profileId,
                    UserCode = dto.UserCode,
                    Role = dto.Role
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Registration failed", error = ex.Message });
            }
        }

        // PUT: api/TaxiRankUsers/marshals/{id}
        [HttpPut("marshals/{id}")]
        public async Task<ActionResult> Update(Guid id, [FromBody] UpdateMarshalDto dto)
        {
            var marshal = await _marshalRepository.GetByIdAsync(id);
            if (marshal == null)
                return NotFound();

            marshal.FullName = dto.FullName ?? marshal.FullName;
            marshal.PhoneNumber = dto.PhoneNumber ?? marshal.PhoneNumber;
            marshal.Email = dto.Email ?? marshal.Email;
            if (dto.TaxiRankId.HasValue)
                marshal.TaxiRankId = dto.TaxiRankId.Value;
            marshal.Status = dto.Status ?? marshal.Status;
            marshal.IdNumber = dto.IdNumber ?? marshal.IdNumber;
            marshal.Address = dto.Address ?? marshal.Address;

            await _marshalRepository.UpdateAsync(marshal);
            return Ok(marshal);
        }

        // PUT: api/TaxiRankUsers/marshals/{id}/status
        [HttpPut("marshals/{id}/status")]
        public async Task<ActionResult> UpdateStatus(Guid id, [FromBody] UpdateMarshalStatusDto dto)
        {
            var marshal = await _marshalRepository.GetByIdAsync(id);
            if (marshal == null)
                return NotFound();

            marshal.Status = dto.Status;
            await _marshalRepository.UpdateAsync(marshal);

            // Update user active status
            if (marshal.User != null)
            {
                marshal.User.IsActive = dto.Status == "Active";
                _userRepository.Update(marshal.User);
            }

            return Ok(marshal);
        }

        // DELETE: api/TaxiRankUsers/marshals/{id}
        [HttpDelete("marshals/{id}")]
        public async Task<ActionResult> Delete(Guid id)
        {
            var marshal = await _marshalRepository.GetByIdAsync(id);
            if (marshal == null)
                return NotFound();

            await _marshalRepository.DeleteAsync(id);
            return NoContent();
        }
    }

    // DTOs
    public class RegisterTaxiRankUserDto
    {
        public Guid TenantId { get; set; }
        public Guid TaxiRankId { get; set; }
        public string Role { get; set; } = string.Empty; // "TaxiRankAdmin" or "TaxiMarshal"
        public string UserCode { get; set; } = string.Empty; // AdminCode or MarshalCode
        public string FullName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public DateTime? HireDate { get; set; }
        public string IdNumber { get; set; }
        public string Address { get; set; }
        
        // Marshal-specific fields
        public TimeSpan? ShiftStartTime { get; set; }
        public TimeSpan? ShiftEndTime { get; set; }
        
        // Admin-specific fields
        public bool? CanManageMarshals { get; set; }
        public bool? CanManageVehicles { get; set; }
        public bool? CanManageSchedules { get; set; }
        public bool? CanViewReports { get; set; }
    }

    public class UpdateMarshalDto
    {
        public string FullName { get; set; }
        public string PhoneNumber { get; set; }
        public string Email { get; set; }
        public Guid? TaxiRankId { get; set; }
        public string Status { get; set; }
        public string IdNumber { get; set; }
        public string Address { get; set; }
    }

    public class UpdateMarshalStatusDto
    {
        public string Status { get; set; } = string.Empty;
    }

    public class TaxiRankUserRegistrationResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public Guid UserId { get; set; }
        public Guid ProfileId { get; set; }
        public string UserCode { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }
}
