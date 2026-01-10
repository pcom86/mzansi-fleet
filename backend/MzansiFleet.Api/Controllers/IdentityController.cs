using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.DTOs;
using MzansiFleet.Application.Commands;
using MzansiFleet.Application.Queries;
using MzansiFleet.Application.Handlers;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class IdentityController : ControllerBase
    {
        private readonly CreateTenantCommandHandler _createTenantHandler;
        private readonly UpdateTenantCommandHandler _updateTenantHandler;
        private readonly DeleteTenantCommandHandler _deleteTenantHandler;
        private readonly GetTenantsQueryHandler _getTenantsHandler;
        private readonly GetTenantByIdQueryHandler _getTenantByIdHandler;
        private readonly CreateUserCommandHandler _createUserHandler;
        private readonly UpdateUserCommandHandler _updateUserHandler;
        private readonly DeleteUserCommandHandler _deleteUserHandler;
        private readonly GetUsersQueryHandler _getUsersHandler;
        private readonly GetUserByIdQueryHandler _getUserByIdHandler;
        private readonly CreateOwnerProfileCommandHandler _createOwnerProfileHandler;
        private readonly UpdateOwnerProfileCommandHandler _updateOwnerProfileHandler;
        private readonly DeleteOwnerProfileCommandHandler _deleteOwnerProfileHandler;
        private readonly GetOwnerProfilesQueryHandler _getOwnerProfilesHandler;
        private readonly GetOwnerProfileByIdQueryHandler _getOwnerProfileByIdHandler;
        private readonly CreateDriverCommandHandler _createDriverHandler;
        private readonly UpdateDriverCommandHandler _updateDriverHandler;
        private readonly DeleteDriverCommandHandler _deleteDriverHandler;
        private readonly GetDriversQueryHandler _getDriversHandler;
        private readonly GetDriverByIdQueryHandler _getDriverByIdHandler;
        private readonly CreateStaffProfileCommandHandler _createStaffProfileHandler;
        private readonly UpdateStaffProfileCommandHandler _updateStaffProfileHandler;
        private readonly DeleteStaffProfileCommandHandler _deleteStaffProfileHandler;
        private readonly GetAllStaffProfilesQueryHandler _getStaffProfilesHandler;
        private readonly GetStaffProfileByIdQueryHandler _getStaffProfileByIdHandler;
        private readonly LoginCommandHandler _loginHandler;
        private readonly LogoutCommandHandler _logoutHandler;
        private readonly ChangePasswordCommandHandler _changePasswordHandler;
        private readonly RegisterServiceProviderCommandHandler _registerServiceProviderHandler;
        
        public IdentityController(
            CreateTenantCommandHandler createTenantHandler,
            UpdateTenantCommandHandler updateTenantHandler,
            DeleteTenantCommandHandler deleteTenantHandler,
            GetTenantsQueryHandler getTenantsHandler,
            GetTenantByIdQueryHandler getTenantByIdHandler,
            CreateUserCommandHandler createUserHandler,
            UpdateUserCommandHandler updateUserHandler,
            DeleteUserCommandHandler deleteUserHandler,
            GetUsersQueryHandler getUsersHandler,
            GetUserByIdQueryHandler getUserByIdHandler,
            CreateOwnerProfileCommandHandler createOwnerProfileHandler,
            UpdateOwnerProfileCommandHandler updateOwnerProfileHandler,
            DeleteOwnerProfileCommandHandler deleteOwnerProfileHandler,
            GetOwnerProfilesQueryHandler getOwnerProfilesHandler,
            GetOwnerProfileByIdQueryHandler getOwnerProfileByIdHandler,
            CreateDriverCommandHandler createDriverHandler,
            UpdateDriverCommandHandler updateDriverHandler,
            DeleteDriverCommandHandler deleteDriverHandler,
            GetDriversQueryHandler getDriversHandler,
            GetDriverByIdQueryHandler getDriverByIdHandler,
            CreateStaffProfileCommandHandler createStaffProfileHandler,
            UpdateStaffProfileCommandHandler updateStaffProfileHandler,
            DeleteStaffProfileCommandHandler deleteStaffProfileHandler,
            GetAllStaffProfilesQueryHandler getStaffProfilesHandler,
            GetStaffProfileByIdQueryHandler getStaffProfileByIdHandler,
            LoginCommandHandler loginHandler,
            LogoutCommandHandler logoutHandler,
            ChangePasswordCommandHandler changePasswordHandler,
            RegisterServiceProviderCommandHandler registerServiceProviderHandler)
        {
            _createTenantHandler = createTenantHandler;
            _updateTenantHandler = updateTenantHandler;
            _deleteTenantHandler = deleteTenantHandler;
            _getTenantsHandler = getTenantsHandler;
            _getTenantByIdHandler = getTenantByIdHandler;
            _createUserHandler = createUserHandler;
            _updateUserHandler = updateUserHandler;
            _deleteUserHandler = deleteUserHandler;
            _getUsersHandler = getUsersHandler;
            _getUserByIdHandler = getUserByIdHandler;
            _createOwnerProfileHandler = createOwnerProfileHandler;
            _updateOwnerProfileHandler = updateOwnerProfileHandler;
            _deleteOwnerProfileHandler = deleteOwnerProfileHandler;
            _getOwnerProfilesHandler = getOwnerProfilesHandler;
            _getOwnerProfileByIdHandler = getOwnerProfileByIdHandler;
            _createDriverHandler = createDriverHandler;
            _updateDriverHandler = updateDriverHandler;
            _deleteDriverHandler = deleteDriverHandler;
            _getDriversHandler = getDriversHandler;
            _getDriverByIdHandler = getDriverByIdHandler;
            _createStaffProfileHandler = createStaffProfileHandler;
            _updateStaffProfileHandler = updateStaffProfileHandler;
            _deleteStaffProfileHandler = deleteStaffProfileHandler;
            _getStaffProfilesHandler = getStaffProfilesHandler;
            _getStaffProfileByIdHandler = getStaffProfileByIdHandler;
            _loginHandler = loginHandler;
            _changePasswordHandler = changePasswordHandler;
            _logoutHandler = logoutHandler;
            _registerServiceProviderHandler = registerServiceProviderHandler;
        }
        [HttpGet("tenants")]
        public ActionResult<IEnumerable<Tenant>> GetTenants()
        {
            return Ok(_getTenantsHandler.Handle(new GetTenantsQuery()));
        }
        [HttpGet("tenants/{id}")]
        public ActionResult<Tenant> GetTenantById(Guid id)
        {
            var tenant = _getTenantByIdHandler.Handle(new GetTenantByIdQuery { Id = id }, CancellationToken.None);
            if (tenant == null) return NotFound();
            return Ok(tenant);
        }
        [HttpPost("tenants")]
        public async Task<IActionResult> CreateTenant([FromBody] CreateTenantDto dto)
        {
            var command = new CreateTenantCommand {
                Id = dto.Id,
                Name = dto.Name,
                ContactEmail = dto.ContactEmail,
                ContactPhone = dto.ContactPhone
            };
            var created = await _createTenantHandler.Handle(command, CancellationToken.None);
            return CreatedAtAction(nameof(GetTenantById), new { id = created.Id }, created);
        }
        [HttpPut("tenants/{id}")]
        public IActionResult UpdateTenant(Guid id, [FromBody] Tenant tenant)
        {
            if (id != tenant.Id) return BadRequest(new { error = "ID mismatch" });
            
            var command = new UpdateTenantCommand {
                Id = tenant.Id,
                Name = tenant.Name ?? string.Empty,
                ContactEmail = tenant.ContactEmail ?? string.Empty,
                ContactPhone = tenant.ContactPhone ?? string.Empty
            };
            _updateTenantHandler.Handle(command, CancellationToken.None);
            return NoContent();
        }
        [HttpDelete("tenants/{id}")]
        public IActionResult DeleteTenant(Guid id)
        {
            _deleteTenantHandler.Handle(new DeleteTenantCommand { Id = id }, CancellationToken.None);
            return NoContent();
        }
        [HttpGet("users")]
        public ActionResult<IEnumerable<User>> GetUsers()
        {
            return Ok(_getUsersHandler.Handle(new GetUsersQuery()));
        }
        [HttpGet("users/{id}")]
        public ActionResult<User> GetUserById(Guid id)
        {
            var user = _getUserByIdHandler.Handle(new GetUserByIdQuery { Id = id }, CancellationToken.None);
            if (user == null) return NotFound();
            return Ok(user);
        }
        [HttpPost("users")]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
        {
            // Hash the password using BCrypt
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            
            var command = new CreateUserCommand {
                TenantId = dto.TenantId,
                Email = dto.Email,
                Phone = dto.Phone,
                PasswordHash = passwordHash,
                Role = dto.Role,
                IsActive = dto.IsActive
            };
            var created = await _createUserHandler.Handle(command, CancellationToken.None);
            return CreatedAtAction(nameof(GetUserById), new { id = created.Id }, created);
        }
        [HttpPut("users/{id}")]
        public IActionResult UpdateUser(Guid id, [FromBody] User user)
        {
            if (id != user.Id) return BadRequest();
            var command = new UpdateUserCommand {
                Id = user.Id,
                TenantId = user.TenantId,
                Email = user.Email,
                Phone = user.Phone,
                PasswordHash = user.PasswordHash,
                Role = user.Role,
                IsActive = user.IsActive
            };
            _updateUserHandler.Handle(command, CancellationToken.None);
            return NoContent();
        }
        [HttpPut("users/{id}/activate")]
        public async Task<IActionResult> ActivateUser(Guid id)
        {
            var user = await _getUserByIdHandler.Handle(new GetUserByIdQuery { Id = id }, CancellationToken.None);
            if (user == null) return NotFound();
            
            var command = new UpdateUserCommand {
                Id = user.Id,
                TenantId = user.TenantId,
                Email = user.Email,
                Phone = user.Phone,
                PasswordHash = user.PasswordHash,
                Role = user.Role,
                IsActive = true
            };
            await _updateUserHandler.Handle(command, CancellationToken.None);
            return NoContent();
        }
        [HttpDelete("users/{id}")]
        public IActionResult DeleteUser(Guid id)
        {
            _deleteUserHandler.Handle(new DeleteUserCommand { Id = id }, CancellationToken.None);
            return NoContent();
        }
        [HttpGet("ownerprofiles")]
        public ActionResult<IEnumerable<OwnerProfile>> GetOwnerProfiles()
        {
            return Ok(_getOwnerProfilesHandler.Handle(new GetOwnerProfilesQuery()));
        }
        [HttpGet("ownerprofiles/{id}")]
        public ActionResult<OwnerProfile> GetOwnerProfileById(Guid id)
        {
            var profile = _getOwnerProfileByIdHandler.Handle(new GetOwnerProfileByIdQuery { Id = id }, CancellationToken.None);
            if (profile == null) return NotFound();
            return Ok(profile);
        }
        [HttpPost("ownerprofiles")]
        public async Task<IActionResult> CreateOwnerProfile([FromBody] CreateOwnerProfileDto dto)
        {
            if (dto == null || dto.UserId == Guid.Empty)
            {
                return BadRequest(new { error = "UserId is required and must be a valid GUID" });
            }

            var command = new CreateOwnerProfileCommand {
                UserId = dto.UserId,
                CompanyName = dto.CompanyName,
                Address = dto.Address,
                ContactName = dto.ContactName,
                ContactPhone = dto.ContactPhone,
                ContactEmail = dto.ContactEmail
            };
            var created = await _createOwnerProfileHandler.Handle(command, CancellationToken.None);
            return CreatedAtAction(nameof(GetOwnerProfileById), new { id = created.Id }, created);
        }
        [HttpPut("ownerprofiles/{id}")]
        public IActionResult UpdateOwnerProfile(Guid id, [FromBody] OwnerProfile profile)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            
            if (id != profile.Id) return BadRequest("ID mismatch");
            
            var command = new UpdateOwnerProfileCommand {
                Id = profile.Id,
                UserId = profile.UserId,
                CompanyName = profile.CompanyName ?? string.Empty,
                Address = profile.Address ?? string.Empty,
                ContactName = profile.ContactName ?? string.Empty,
                ContactPhone = profile.ContactPhone ?? string.Empty,
                ContactEmail = profile.ContactEmail ?? string.Empty
            };
            _updateOwnerProfileHandler.Handle(command, CancellationToken.None);
            return NoContent();
        }
        [HttpDelete("ownerprofiles/{id}")]
        public IActionResult DeleteOwnerProfile(Guid id)
        {
            _deleteOwnerProfileHandler.Handle(new DeleteOwnerProfileCommand { Id = id }, CancellationToken.None);
            return NoContent();
        }

        // Driver Profiles
        [HttpGet("driverprofiles")]
        public ActionResult<IEnumerable<DriverProfile>> GetDriverProfiles()
        {
            return Ok(_getDriversHandler.Handle(new GetDriversQuery()));
        }
        [HttpGet("driverprofiles/{id}")]
        public ActionResult<DriverProfile> GetDriverProfileById(Guid id)
        {
            var profile = _getDriverByIdHandler.Handle(new GetDriverByIdQuery { Id = id });
            if (profile == null) return NotFound();
            return Ok(profile);
        }
        [HttpPost("driverprofiles")]
        public IActionResult CreateDriverProfile([FromBody] CreateDriverProfileDto dto)
        {
            if (dto == null || dto.UserId == Guid.Empty)
            {
                return BadRequest(new { error = "UserId is required and must be a valid GUID" });
            }

            var command = new CreateDriverCommand {
                UserId = dto.UserId,
                Name = dto.Name,
                IdNumber = dto.IdNumber,
                Phone = dto.Phone,
                Email = dto.Email,
                PhotoUrl = dto.PhotoUrl,
                LicenseCopy = dto.LicenseCopy,
                Experience = dto.Experience,
                Category = dto.Category,
                HasPdp = dto.HasPdp,
                PdpCopy = dto.PdpCopy,
                IsActive = dto.IsActive,
                IsAvailable = dto.IsAvailable,
                AssignedVehicleId = dto.AssignedVehicleId
            };
            var created = _createDriverHandler.Handle(command);
            return CreatedAtAction(nameof(GetDriverProfileById), new { id = created.Id }, created);
        }
        [HttpPut("driverprofiles/{id}")]
        public IActionResult UpdateDriverProfile(Guid id, [FromBody] UpdateDriverProfileDto dto)
        {
            if (id != dto.Id) return BadRequest();
            var command = new UpdateDriverCommand {
                Id = dto.Id,
                UserId = dto.UserId,
                Name = dto.Name,
                IdNumber = dto.IdNumber,
                Phone = dto.Phone,
                Email = dto.Email,
                PhotoUrl = dto.PhotoUrl,
                LicenseCopy = dto.LicenseCopy,
                Experience = dto.Experience,
                Category = dto.Category,
                HasPdp = dto.HasPdp,
                PdpCopy = dto.PdpCopy,
                IsActive = dto.IsActive,
                IsAvailable = dto.IsAvailable,
                AssignedVehicleId = dto.AssignedVehicleId
            };
            _updateDriverHandler.Handle(command);
            return NoContent();
        }
        [HttpDelete("driverprofiles/{id}")]
        public IActionResult DeleteDriverProfile(Guid id)
        {
            _deleteDriverHandler.Handle(new DeleteDriverCommand { Id = id });
            return NoContent();
        }

        // Staff Profiles
        [HttpGet("staffprofiles")]
        public ActionResult<IEnumerable<StaffProfile>> GetStaffProfiles()
        {
            return Ok(_getStaffProfilesHandler.Handle(new GetAllStaffProfilesQuery(), CancellationToken.None).Result);
        }
        [HttpGet("staffprofiles/{id}")]
        public ActionResult<StaffProfile> GetStaffProfileById(Guid id)
        {
            var profile = _getStaffProfileByIdHandler.Handle(new GetStaffProfileByIdQuery { Id = id }, CancellationToken.None).Result;
            if (profile == null) return NotFound();
            return Ok(profile);
        }
        [HttpPost("staffprofiles")]
        public IActionResult CreateStaffProfile([FromBody] CreateStaffProfileDto dto)
        {
            if (dto == null || dto.UserId == Guid.Empty)
            {
                return BadRequest(new { error = "UserId is required and must be a valid GUID" });
            }

            var command = new CreateStaffProfileCommand {
                UserId = dto.UserId,
                Role = dto.Role
            };
            var created = _createStaffProfileHandler.Handle(command, CancellationToken.None);
            return CreatedAtAction(nameof(GetStaffProfileById), new { id = created.Id }, created);
        }
        [HttpPut("staffprofiles/{id}")]
        public IActionResult UpdateStaffProfile(Guid id, [FromBody] StaffProfile profile)
        {
            if (id != profile.Id) return BadRequest();
            var command = new UpdateStaffProfileCommand {
                Id = profile.Id,
                UserId = profile.UserId,
                Role = profile.Role
            };
            _updateStaffProfileHandler.Handle(command, CancellationToken.None);
            return NoContent();
        }
        [HttpDelete("staffprofiles/{id}")]
        public IActionResult DeleteStaffProfile(Guid id)
        {
            _deleteStaffProfileHandler.Handle(new DeleteStaffProfileCommand { Id = id }, CancellationToken.None);
            return NoContent();
        }

        // Service Provider Registration
        [HttpPost("register-service-provider")]
        public async Task<IActionResult> RegisterServiceProvider([FromBody] RegisterServiceProviderDto dto)
        {
            if (dto == null)
            {
                return BadRequest(new { error = "Registration data is required" });
            }

            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new { error = "Email and password are required" });
            }

            if (string.IsNullOrWhiteSpace(dto.BusinessName))
            {
                return BadRequest(new { error = "Business name is required" });
            }

            try
            {
                var command = new RegisterServiceProviderCommand
                {
                    TenantId = dto.TenantId,
                    Email = dto.Email,
                    Password = dto.Password,
                    Phone = dto.Phone,
                    BusinessName = dto.BusinessName,
                    RegistrationNumber = dto.RegistrationNumber,
                    ContactPerson = dto.ContactPerson,
                    Address = dto.Address,
                    ServiceTypes = dto.ServiceTypes,
                    VehicleCategories = dto.VehicleCategories,
                    OperatingHours = dto.OperatingHours,
                    HourlyRate = dto.HourlyRate,
                    CallOutFee = dto.CallOutFee,
                    ServiceRadiusKm = dto.ServiceRadiusKm,
                    BankAccount = dto.BankAccount,
                    TaxNumber = dto.TaxNumber,
                    CertificationsLicenses = dto.CertificationsLicenses,
                    Notes = dto.Notes
                };

                var profile = await _registerServiceProviderHandler.Handle(command, CancellationToken.None);
                
                return Ok(new
                {
                    message = "Service provider registered successfully",
                    profileId = profile.Id,
                    userId = profile.UserId,
                    businessName = profile.BusinessName,
                    email = profile.Email
                });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An error occurred during registration", details = ex.Message });
            }
        }

        [HttpPost("users/{id}/password")]
        public async Task<IActionResult> ChangePassword(Guid id, [FromBody] ChangePasswordRequestDto request)
        {
            try
            {
                var command = new ChangePasswordCommand
                {
                    UserId = id,
                    CurrentPassword = request.CurrentPassword,
                    NewPassword = request.NewPassword
                };
                var result = await _changePasswordHandler.Handle(command, CancellationToken.None);
                if (!result)
                {
                    return BadRequest(new { message = "Current password is incorrect" });
                }
                return Ok(new { message = "Password changed successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("login")]
        public ActionResult<LoginResponseDto> Login([FromBody] LoginRequestDto request)
        {
            try
            {
                var command = new LoginCommand
                {
                    Email = request.Email,
                    Password = request.Password
                };
                var response = _loginHandler.Handle(command, CancellationToken.None);
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred during login", detail = ex.Message });
            }
        }

        [HttpPost("logout")]
        public IActionResult Logout([FromBody] LogoutRequestDto request)
        {
            try
            {
                var command = new LogoutCommand
                {
                    Token = request.Token
                };
                _logoutHandler.Handle(command, CancellationToken.None);
                return Ok(new { message = "Logged out successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred during logout", detail = ex.Message });
            }
        }
    }

    // DTOs for API requests
    public class CreateTenantDto
    {
        public Guid? Id { get; set; }  // Optional - if not provided, will be generated
        public string Name { get; set; }
        public string ContactEmail { get; set; }
        public string ContactPhone { get; set; }
    }

    public class CreateUserDto
    {
        public Guid TenantId { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string Password { get; set; }  // Changed from PasswordHash to Password
        public string Role { get; set; }
        public bool IsActive { get; set; } = true;  // Default to active
    }

    public class CreateOwnerProfileDto
    {
        public Guid UserId { get; set; }
        public string CompanyName { get; set; }
        public string Address { get; set; }
        public string ContactName { get; set; }
        public string ContactPhone { get; set; }
        public string ContactEmail { get; set; }
    }

    public class CreateDriverProfileDto
    {
        public Guid UserId { get; set; }
        public string Name { get; set; }
        public string IdNumber { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string PhotoUrl { get; set; }
        public string LicenseCopy { get; set; }
        public string Experience { get; set; }
        public string Category { get; set; }
        public bool HasPdp { get; set; }
        public string PdpCopy { get; set; }
        public bool IsActive { get; set; }
        public bool IsAvailable { get; set; }
        public Guid? AssignedVehicleId { get; set; }
    }

    public class UpdateDriverProfileDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Name { get; set; }
        public string IdNumber { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string PhotoUrl { get; set; }
        public string LicenseCopy { get; set; }
        public string Experience { get; set; }
        public string Category { get; set; }
        public bool HasPdp { get; set; }
        public string PdpCopy { get; set; }
        public bool IsActive { get; set; }
        public bool IsAvailable { get; set; }
        public Guid? AssignedVehicleId { get; set; }
    }

    public class CreateStaffProfileDto
    {
        public Guid UserId { get; set; }
        public string Role { get; set; }
    }

    public class ChangePasswordRequestDto
    {
        public string CurrentPassword { get; set; }
        public string NewPassword { get; set; }
    }
}
