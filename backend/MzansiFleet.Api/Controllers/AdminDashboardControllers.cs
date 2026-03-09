#nullable enable

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Application.DTOs;
using MzansiFleet.Application.Services;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RoutesController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public RoutesController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TripSchedule>>> GetAll([FromQuery] Guid? taxiRankId = null, [FromQuery] Guid? tenantId = null)
        {
            IQueryable<TripSchedule> query = _context.TripSchedules;

            if (taxiRankId.HasValue)
            {
                query = query.Where(r => r.TaxiRankId == taxiRankId.Value);
            }

            if (tenantId.HasValue)
            {
                query = query.Where(r => r.TenantId == tenantId.Value);
            }

            var routes = await query.ToListAsync();
            return Ok(routes);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TripSchedule>> GetById(Guid id)
        {
            var route = await _context.TripSchedules.FindAsync(id);
            if (route == null)
                return NotFound();

            return Ok(route);
        }

        [HttpPost]
        public async Task<ActionResult<TripSchedule>> Create([FromBody] CreateRouteDto dto)
        {
            var route = new TripSchedule
            {
                Id = Guid.NewGuid(),
                TenantId = dto.TenantId,
                RouteName = dto.Name,
                DepartureStation = dto.Origin,
                DestinationStation = dto.Destination,
                StandardFare = dto.FareAmount,
                ExpectedDurationMinutes = dto.EstimatedDuration,
                IsActive = dto.Status == "Active"
            };
            
            _context.TripSchedules.Add(route);
            await _context.SaveChangesAsync();
            
            return CreatedAtAction(nameof(GetById), new { id = route.Id }, route);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> Update(Guid id, [FromBody] UpdateRouteDto dto)
        {
            var route = await _context.TripSchedules.FindAsync(id);
            if (route == null)
                return NotFound();

            if (dto.TenantId.HasValue)
                route.TenantId = dto.TenantId.Value;
            route.RouteName = dto.Name ?? route.RouteName;
            route.DepartureStation = dto.Origin ?? route.DepartureStation;
            route.DestinationStation = dto.Destination ?? route.DestinationStation;
            route.StandardFare = dto.FareAmount ?? route.StandardFare;
            route.ExpectedDurationMinutes = dto.EstimatedDuration ?? route.ExpectedDurationMinutes;
            route.IsActive = dto.Status == "Active" || dto.Status == "true";

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(Guid id)
        {
            var route = await _context.TripSchedules.FindAsync(id);
            if (route == null)
                return NotFound();

            _context.TripSchedules.Remove(route);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class OwnerAssignmentsController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public OwnerAssignmentsController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<OwnerAssignment>>> GetAll()
        {
            var assignments = await _context.OwnerAssignments
                .Include(a => a.Owner)
                    .ThenInclude(o => o!.User)
                .Include(a => a.TaxiRank)
                .ToListAsync();
            
            return Ok(assignments);
        }

        [HttpPost]
        public async Task<ActionResult<OwnerAssignment>> Create([FromBody] CreateOwnerAssignmentDto dto)
        {
            var assignment = new OwnerAssignment
            {
                Id = Guid.NewGuid(),
                OwnerId = dto.OwnerId,
                TaxiRankId = dto.TaxiRankId,
                AssignedDate = DateTime.UtcNow,
                Status = "Active"
            };
            
            _context.OwnerAssignments.Add(assignment);
            await _context.SaveChangesAsync();
            
            // Reload with related entities
            var created = await _context.OwnerAssignments
                .Include(a => a.Owner)
                    .ThenInclude(o => o!.User)
                .Include(a => a.TaxiRank)
                .FirstOrDefaultAsync(a => a.Id == assignment.Id);
            
            return Ok(created);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(Guid id)
        {
            var assignment = await _context.OwnerAssignments.FindAsync(id);
            if (assignment == null)
            {
                return NotFound();
            }
            
            _context.OwnerAssignments.Remove(assignment);
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class VehicleRouteAssignmentsController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public VehicleRouteAssignmentsController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<RouteVehicle>>> GetAll()
        {
            var assignments = await _context.RouteVehicles
                .Include(a => a.Vehicle)
                .Include(a => a.TripSchedule)
                .ToListAsync();
            
            return Ok(assignments);
        }

        [HttpPost]
        public async Task<ActionResult<RouteVehicle>> Create([FromBody] CreateVehicleRouteAssignmentDto dto)
        {
            var assignment = new RouteVehicle
            {
                Id = Guid.NewGuid(),
                VehicleId = dto.VehicleId,
                TripScheduleId = dto.RouteId,
                AssignedAt = DateTime.UtcNow,
                IsActive = true
            };
            
            _context.RouteVehicles.Add(assignment);
            await _context.SaveChangesAsync();
            
            // Reload with related entities
            var created = await _context.RouteVehicles
                .Include(a => a.Vehicle)
                .Include(a => a.TripSchedule)
                .FirstOrDefaultAsync(a => a.Id == assignment.Id);
            
            return Ok(created);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(Guid id)
        {
            var assignment = await _context.RouteVehicles.FindAsync(id);
            if (assignment == null)
            {
                return NotFound();
            }
            
            _context.RouteVehicles.Remove(assignment);
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TripSchedulesController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;
        private readonly ITaxiRankRepository _taxiRankRepository;
        private readonly IUserRepository _userRepository;

        public TripSchedulesController(
            MzansiFleetDbContext context,
            ITaxiRankRepository taxiRankRepository,
            IUserRepository userRepository)
        {
            _context = context;
            _taxiRankRepository = taxiRankRepository;
            _userRepository = userRepository;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TripSchedule>>> GetAll([FromQuery] Guid? rankId = null, [FromQuery] Guid? tenantId = null)
        {
            // Get current user
            var userIdClaim = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user identity" });
            }

            var user = _userRepository.GetById(userId);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            IQueryable<TripSchedule> query = _context.TripSchedules.Include(ts => ts.TaxiRank);

            // Filter based on user role
            if (user.Role == "TaxiRankAdmin" || user.Role == "TaxiMarshal")
            {
                // Get user's assigned taxi rank
                TaxiRank? assignedRank = null;
                if (user.Role == "TaxiMarshal")
                {
                    var marshalProfile = await _context.TaxiMarshalProfiles
                        .FirstOrDefaultAsync(tmp => tmp.UserId == userId);
                    if (marshalProfile != null)
                    {
                        assignedRank = await _taxiRankRepository.GetByIdAsync(marshalProfile.TaxiRankId);
                    }
                }
                else if (user.Role == "TaxiRankAdmin")
                {
                    var adminProfile = await _context.TaxiRankAdmins
                        .FirstOrDefaultAsync(trap => trap.UserId == userId);
                    if (adminProfile != null)
                    {
                        assignedRank = await _taxiRankRepository.GetByIdAsync(adminProfile.TaxiRankId);
                    }
                }

                if (assignedRank != null)
                {
                    // Only show schedules for the assigned taxi rank
                    query = query.Where(ts => ts.TaxiRankId == assignedRank.Id);
                }
                else
                {
                    // User has no assigned rank, return empty
                    return Ok(new List<TripSchedule>());
                }
            }
            else
            {
                // For other roles, apply optional filters
                if (rankId.HasValue)
                {
                    query = query.Where(ts => ts.TaxiRankId == rankId.Value);
                }

                if (tenantId.HasValue)
                {
                    query = query.Where(ts => ts.TenantId == tenantId.Value);
                }
            }

            var schedules = await query.OrderBy(ts => ts.DepartureTime).ToListAsync();
            return Ok(schedules);
        }

        [HttpPost]
        [Authorize(Roles = "TaxiRankAdmin,TaxiMarshal")]
        public async Task<ActionResult<TripSchedule>> Create([FromBody] CreateTripScheduleDto dto)
        {
            // Get current user
            var userIdClaim = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user identity" });
            }

            var user = _userRepository.GetById(userId);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            // Validate that the taxi rank belongs to the user's tenant and is assigned to them
            var taxiRank = await _taxiRankRepository.GetByIdAsync(dto.TaxiRankId);
            if (taxiRank == null || taxiRank.TenantId != dto.TenantId)
            {
                return BadRequest(new { message = "Invalid taxi rank or taxi rank does not belong to the specified tenant" });
            }

            // Check if user is authorized for this taxi rank
            bool isAuthorized = false;
            if (user.Role == "TaxiMarshal")
            {
                var marshalProfile = await _context.TaxiMarshalProfiles
                    .FirstOrDefaultAsync(tmp => tmp.UserId == userId && tmp.TaxiRankId == dto.TaxiRankId);
                isAuthorized = marshalProfile != null;
            }
            else if (user.Role == "TaxiRankAdmin")
            {
                var adminProfile = await _context.TaxiRankAdmins
                    .FirstOrDefaultAsync(trap => trap.UserId == userId && trap.TaxiRankId == dto.TaxiRankId);
                isAuthorized = adminProfile != null;
            }

            if (!isAuthorized)
            {
                return Forbid("You are not authorized to manage schedules for this taxi rank");
            }

            var schedule = new TripSchedule
            {
                Id = Guid.NewGuid(),
                TaxiRankId = dto.TaxiRankId,
                TenantId = dto.TenantId,
                RouteName = dto.RouteName,
                DepartureStation = dto.DepartureStation,
                DestinationStation = dto.DestinationStation,
                DepartureTime = TimeSpan.Parse(dto.DepartureTime),
                FrequencyMinutes = dto.FrequencyMinutes,
                DaysOfWeek = dto.DaysOfWeek,
                StandardFare = dto.StandardFare,
                ExpectedDurationMinutes = dto.ExpectedDurationMinutes,
                MaxPassengers = dto.MaxPassengers,
                IsActive = dto.IsActive,
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow
            };
            
            _context.TripSchedules.Add(schedule);
            await _context.SaveChangesAsync();
            
            return CreatedAtAction(nameof(GetAll), new { id = schedule.Id }, schedule);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "TaxiRankAdmin,TaxiMarshal")]
        public async Task<ActionResult> Update(Guid id, [FromBody] UpdateTripScheduleDto dto)
        {
            // Get current user
            var userIdClaim = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user identity" });
            }

            var schedule = await _context.TripSchedules.FindAsync(id);
            if (schedule == null)
            {
                return NotFound();
            }

            // Check if user is authorized for this taxi rank
            var user = _userRepository.GetById(userId);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }
            
            bool isAuthorized = false;
            if (user.Role == "TaxiMarshal")
            {
                var marshalProfile = await _context.TaxiMarshalProfiles
                    .FirstOrDefaultAsync(tmp => tmp.UserId == userId && tmp.TaxiRankId == schedule.TaxiRankId);
                isAuthorized = marshalProfile != null;
            }
            else if (user.Role == "TaxiRankAdmin")
            {
                var adminProfile = await _context.TaxiRankAdmins
                    .FirstOrDefaultAsync(trap => trap.UserId == userId && trap.TaxiRankId == schedule.TaxiRankId);
                isAuthorized = adminProfile != null;
            }

            if (!isAuthorized)
            {
                return Forbid("You are not authorized to update schedules for this taxi rank");
            }

            // Update fields
            if (!string.IsNullOrEmpty(dto.RouteName))
                schedule.RouteName = dto.RouteName;
            if (!string.IsNullOrEmpty(dto.DepartureStation))
                schedule.DepartureStation = dto.DepartureStation;
            if (!string.IsNullOrEmpty(dto.DestinationStation))
                schedule.DestinationStation = dto.DestinationStation;
            if (!string.IsNullOrEmpty(dto.DepartureTime))
                schedule.DepartureTime = TimeSpan.Parse(dto.DepartureTime);
            if (dto.FrequencyMinutes > 0)
                schedule.FrequencyMinutes = dto.FrequencyMinutes;
            if (!string.IsNullOrEmpty(dto.DaysOfWeek))
                schedule.DaysOfWeek = dto.DaysOfWeek;
            if (dto.StandardFare > 0)
                schedule.StandardFare = dto.StandardFare;
            if (dto.ExpectedDurationMinutes.HasValue)
                schedule.ExpectedDurationMinutes = dto.ExpectedDurationMinutes.Value;
            if (dto.MaxPassengers.HasValue)
                schedule.MaxPassengers = dto.MaxPassengers.Value;
            schedule.IsActive = dto.IsActive;
            if (!string.IsNullOrEmpty(dto.Notes))
                schedule.Notes = dto.Notes;

            schedule.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "TaxiRankAdmin,TaxiMarshal")]
        public async Task<ActionResult> Delete(Guid id)
        {
            // Get current user
            var userIdClaim = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user identity" });
            }

            var schedule = await _context.TripSchedules.FindAsync(id);
            if (schedule == null)
            {
                return NotFound();
            }

            // Check if user is authorized for this taxi rank
            var user = _userRepository.GetById(userId);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }
            
            bool isAuthorized = false;
            if (user.Role == "TaxiMarshal")
            {
                var marshalProfile = await _context.TaxiMarshalProfiles
                    .FirstOrDefaultAsync(tmp => tmp.UserId == userId && tmp.TaxiRankId == schedule.TaxiRankId);
                isAuthorized = marshalProfile != null;
            }
            else if (user.Role == "TaxiRankAdmin")
            {
                var adminProfile = await _context.TaxiRankAdmins
                    .FirstOrDefaultAsync(trap => trap.UserId == userId && trap.TaxiRankId == schedule.TaxiRankId);
                isAuthorized = adminProfile != null;
            }

            if (!isAuthorized)
            {
                return Forbid("You are not authorized to delete schedules for this taxi rank");
            }

            _context.TripSchedules.Remove(schedule);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class MarshalsController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;
        private readonly ITaxiMarshalRepository _marshalRepository;
        private readonly IUserRepository _userRepository;

        public MarshalsController(
            MzansiFleetDbContext context,
            ITaxiMarshalRepository marshalRepository,
            IUserRepository userRepository)
        {
            _context = context;
            _marshalRepository = marshalRepository;
            _userRepository = userRepository;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetAll()
        {
            // Redirect to the proper endpoint
            return Ok(new List<object>());
        }

        [HttpPost]
        public async Task<ActionResult> Create([FromBody] CreateMarshalDto dto)
        {
            try
            {
                // Get tenantId from logged-in user or from dto
                var tenantId = dto.TenantId;
                if (tenantId == Guid.Empty)
                {
                    return BadRequest(new { message = "TenantId is required" });
                }

                // Validate tenant exists
                var tenant = await _context.Tenants.FindAsync(tenantId);
                if (tenant == null)
                    return BadRequest(new { message = "Invalid tenant" });

                // Check if email already exists
                var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
                if (existingUser != null)
                {
                    return BadRequest(new { message = "Email already registered" });
                }

                // Check if marshal code already exists
                if (!string.IsNullOrEmpty(dto.MarshalCode))
                {
                    var existingMarshal = await _marshalRepository.GetByMarshalCodeAsync(dto.MarshalCode);
                    if (existingMarshal != null)
                        return BadRequest(new { message = "Marshal code already in use" });
                }

                // Create User account
                var userId = Guid.NewGuid();
                var user = new User
                {
                    Id = userId,
                    TenantId = tenantId,
                    Email = dto.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                    Role = "TaxiMarshal",
                    IsActive = true
                };

                _userRepository.Add(user);

                // Get taxi rank - use first available if not specified
                Guid taxiRankId;
                if (dto.TaxiRankId.HasValue && dto.TaxiRankId.Value != Guid.Empty)
                {
                    taxiRankId = dto.TaxiRankId.Value;
                }
                else
                {
                    // Get first taxi rank for this tenant
                    var taxiRank = await _context.TaxiRanks
                        .Where(tr => tr.TenantId == tenantId)
                        .FirstOrDefaultAsync();
                    
                    if (taxiRank == null)
                        return BadRequest(new { message = "No taxi rank found for this tenant" });
                    
                    taxiRankId = taxiRank.Id;
                }

                // Create TaxiMarshalProfile
                var marshalProfile = new TaxiMarshalProfile
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    TenantId = tenantId,
                    TaxiRankId = taxiRankId,
                    MarshalCode = dto.MarshalCode,
                    FullName = $"{dto.FirstName} {dto.LastName}",
                    PhoneNumber = dto.PhoneNumber,
                    Email = dto.Email,
                    HireDate = DateTime.UtcNow,
                    Status = dto.Status ?? "Active",
                    CreatedAt = DateTime.UtcNow
                };

                await _marshalRepository.AddAsync(marshalProfile);

                return Ok(new
                {
                    success = true,
                    message = "Marshal created successfully",
                    userId = userId,
                    profileId = marshalProfile.Id,
                    marshalCode = marshalProfile.MarshalCode
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error creating marshal", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> Update(Guid id, [FromBody] UpdateMarshalDto dto)
        {
            try
            {
                var marshal = await _marshalRepository.GetByIdAsync(id);
                if (marshal == null)
                    return NotFound();

                // Validate taxi rank if provided
                // Temporarily commented out due to DTO compilation issue
                /*
                if (dto.TaxiRankId.HasValue && dto.TaxiRankId.Value != Guid.Empty)
                {
                    var taxiRank = await _context.TaxiRanks.FindAsync(dto.TaxiRankId.Value);
                    if (taxiRank == null)
                        return BadRequest(new { message = "Invalid taxi rank" });

                    // Ensure taxi rank belongs to the same tenant
                    if (taxiRank.TenantId != marshal.TenantId)
                        return BadRequest(new { message = "Taxi rank does not belong to the marshal's tenant" });

                    marshal.TaxiRankId = dto.TaxiRankId.Value;
                }
                */

                // Update marshal profile
                marshal.FullName = !string.IsNullOrEmpty(dto.FirstName) && !string.IsNullOrEmpty(dto.LastName)
                    ? $"{dto.FirstName} {dto.LastName}"
                    : marshal.FullName;
                marshal.PhoneNumber = dto.PhoneNumber ?? marshal.PhoneNumber;
                marshal.Email = dto.Email ?? marshal.Email;
                marshal.Status = dto.Status ?? marshal.Status;
                marshal.UpdatedAt = DateTime.UtcNow;

                // Fix DateTime kind for PostgreSQL
                marshal.HireDate = DateTime.SpecifyKind(marshal.HireDate, DateTimeKind.Utc);
                marshal.CreatedAt = DateTime.SpecifyKind(marshal.CreatedAt, DateTimeKind.Utc);

                await _marshalRepository.UpdateAsync(marshal);

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating marshal", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(Guid id)
        {
            try
            {
                var marshal = await _marshalRepository.GetByIdAsync(id);
                if (marshal == null)
                    return NotFound();

                await _marshalRepository.DeleteAsync(id);

                // Also delete the user account
                if (marshal.UserId != Guid.Empty)
                {
                    var user = _userRepository.GetById(marshal.UserId);
                    if (user != null)
                    {
                        _userRepository.Delete(user.Id);
                    }
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting marshal", error = ex.Message });
            }
        }
    }

    public class CreateMarshalDto
    {
        public Guid TenantId { get; set; }
        public Guid? TaxiRankId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string MarshalCode { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string? ShiftStartTime { get; set; }
        public string? ShiftEndTime { get; set; }
        public string? Status { get; set; }
    }

    public class UpdateMarshalDto
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? ShiftStartTime { get; set; }
        public string? ShiftEndTime { get; set; }
        public string? Status { get; set; }
    }

    [ApiController]
    [Route("api/TripDetails")]
    public class TripDetailsController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;
        private readonly VehicleNotificationService _notificationService;
        private readonly IBookingIntegrationService _bookingIntegrationService;

        public TripDetailsController(MzansiFleetDbContext context, VehicleNotificationService notificationService, IBookingIntegrationService bookingIntegrationService)
        {
            _context = context;
            _notificationService = notificationService;
            _bookingIntegrationService = bookingIntegrationService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Trip>>> GetAll([FromQuery] string? vehicleIds = null)
        {
            var query = _context.Trips
                .Include(t => t.Passengers).AsQueryable();
            
            // Filter by vehicle IDs if provided (comma-separated)
            if (!string.IsNullOrEmpty(vehicleIds))
            {
                var vehicleIdList = vehicleIds.Split(',')
                    .Select(id => Guid.TryParse(id.Trim(), out var guid) ? guid : Guid.Empty)
                    .Where(guid => guid != Guid.Empty)
                    .ToList();
                
                if (vehicleIdList.Any())
                {
                    query = query.Where(t => vehicleIdList.Contains(t.VehicleId));
                }
            }
            
            var trips = await query.OrderByDescending(t => t.TripDate).ToListAsync();
            return Ok(trips);
        }

        [HttpGet("revenue")]
        public async Task<ActionResult<IEnumerable<object>>> GetRevenue(
            [FromQuery] Guid tenantId,
            [FromQuery] Guid? taxiRankId,
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate)
        {
            try
            {
                Console.WriteLine($"=== GetRevenue called ===");
                Console.WriteLine($"TenantId: {tenantId}");
                Console.WriteLine($"TaxiRankId: {taxiRankId}");
                Console.WriteLine($"StartDate: {startDate}");
                Console.WriteLine($"EndDate: {endDate}");
                
                // Convert dates to UTC if they're not already and set time to cover full day
                var utcStartDate = startDate.Kind == DateTimeKind.Unspecified 
                    ? DateTime.SpecifyKind(startDate.Date, DateTimeKind.Utc) 
                    : startDate.ToUniversalTime().Date;
                
                // Set end date to end of day to include all trips on that date
                var utcEndDate = endDate.Kind == DateTimeKind.Unspecified 
                    ? DateTime.SpecifyKind(endDate.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc) 
                    : endDate.ToUniversalTime().Date.AddDays(1).AddTicks(-1);

                Console.WriteLine($"UTC StartDate: {utcStartDate}");
                Console.WriteLine($"UTC EndDate: {utcEndDate}");

                var query = _context.Set<Trip>()
                    .Include(t => t.Passengers)
                    .AsQueryable();

                // Check total trips before filtering
                var totalTripsCount = await query.CountAsync();
                Console.WriteLine($"Total trips in database: {totalTripsCount}");

                // Filter by date range (comparing only dates)
                query = query.Where(t => t.TripDate.Date >= utcStartDate.Date && t.TripDate.Date <= utcEndDate.Date);
                var afterDateFilterCount = await query.CountAsync();
                Console.WriteLine($"Trips after date filter: {afterDateFilterCount}");

                // Filter by tenantId through Vehicle
                var vehicleIds = await _context.Set<Vehicle>()
                    .Where(v => v.TenantId == tenantId)
                    .Select(v => v.Id)
                    .ToListAsync();
                
                Console.WriteLine($"Vehicles found for tenant: {vehicleIds.Count}");
                if (vehicleIds.Count > 0)
                {
                    Console.WriteLine($"First few vehicle IDs: {string.Join(", ", vehicleIds.Take(5))}");
                    query = query.Where(t => vehicleIds.Contains(t.VehicleId));
                    var afterVehicleFilterCount = await query.CountAsync();
                    Console.WriteLine($"Trips after vehicle/tenant filter: {afterVehicleFilterCount}");
                }
                else
                {
                    Console.WriteLine("No vehicles found for this tenant - returning empty result");
                    return Ok(new List<object>());
                }

                // Optionally filter by taxiRankId if provided
                if (taxiRankId.HasValue)
                {
                    var rankVehicleIds = await _context.Set<VehicleTaxiRank>()
                        .Where(vtr => vtr.TaxiRankId == taxiRankId.Value && vtr.IsActive)
                        .Select(vtr => vtr.VehicleId)
                        .ToListAsync();
                    
                    Console.WriteLine($"Vehicles found for taxi rank: {rankVehicleIds.Count}");
                    // Only apply rank filter if vehicles are actually assigned to this rank
                    if (rankVehicleIds.Count > 0)
                    {
                        query = query.Where(t => rankVehicleIds.Contains(t.VehicleId));
                        var afterRankFilterCount = await query.CountAsync();
                        Console.WriteLine($"Trips after taxi rank filter: {afterRankFilterCount}");
                    }
                    else
                    {
                        Console.WriteLine("No vehicles assigned to this rank - showing all tenant trips");
                    }
                }

                var trips = await query
                    .OrderByDescending(t => t.TripDate)
                    .ToListAsync();

                Console.WriteLine($"Final trips returned: {trips.Count}");

                // Get related data
                var routeIds = trips.Where(t => t.RouteId.HasValue).Select(t => t.RouteId!.Value).Distinct().ToList();
                var routes = await _context.Set<Route>()
                    .Where(r => routeIds.Contains(r.Id))
                    .ToDictionaryAsync(r => r.Id, r => r.Name);

                var driverIds = trips.Where(t => t.DriverId.HasValue).Select(t => t.DriverId!.Value).Distinct().ToList();
                var drivers = await _context.Set<DriverProfile>()
                    .Where(d => driverIds.Contains(d.Id))
                    .ToDictionaryAsync(d => d.Id, d => d.Name);

                var tripVehicleIds = trips.Select(t => t.VehicleId).Distinct().ToList();
                var vehicles = await _context.Set<Vehicle>()
                    .Where(v => tripVehicleIds.Contains(v.Id))
                    .ToDictionaryAsync(v => v.Id, v => v.Registration);

                // Get vehicle earnings for these trips
                var tripIds = trips.Select(t => t.Id).ToList();
                var vehicleEarnings = await _context.VehicleEarningRecords
                    .Where(ve => ve.TripId.HasValue && tripIds.Contains(ve.TripId.Value))
                    .GroupBy(ve => ve.TripId)
                    .ToDictionaryAsync(
                        g => g.Key!.Value,
                        g => g.Sum(ve => ve.Amount)
                    );

                // Map to response
                var result = trips.Select(t => new
                {
                    tripId = t.Id.ToString(),
                    tripDate = t.TripDate.ToString("yyyy-MM-dd"),
                    vehicleRegistration = vehicles.ContainsKey(t.VehicleId) ? vehicles[t.VehicleId] : "Unknown",
                    routeName = t.RouteId.HasValue && routes.ContainsKey(t.RouteId.Value) ? routes[t.RouteId.Value] : "Rental",
                    driverName = t.DriverId.HasValue && drivers.ContainsKey(t.DriverId.Value) ? drivers[t.DriverId.Value] : "Owner-Driven",
                    departureTime = t.DepartureTime,
                    arrivalTime = t.ArrivalTime ?? "",
                    passengerCount = t.PassengerCount,
                    totalFare = t.TotalFare,
                    vehicleEarnings = vehicleEarnings.ContainsKey(t.Id) ? vehicleEarnings[t.Id] : 0,
                    driverEarnings = t.TotalFare - (vehicleEarnings.ContainsKey(t.Id) ? vehicleEarnings[t.Id] : 0)
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetRevenue: {ex.Message}");
                Console.WriteLine($"StackTrace: {ex.StackTrace}");
                return BadRequest(new { message = "Error retrieving revenue data", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Trip>> GetById(Guid id)
        {
            var trip = await _context.Set<Trip>()
                .Include(t => t.Passengers)
                .FirstOrDefaultAsync(t => t.Id == id);
            
            if (trip == null)
                return NotFound();
            
            return Ok(trip);
        }

        // NEW: Get passengers from bookings for a scheduled trip
        [HttpGet("passengers/from-bookings")]
        public async Task<ActionResult<IEnumerable<Passenger>>> GetPassengersFromBookings([FromQuery] Guid tripScheduleId, [FromQuery] DateTime travelDate)
        {
            try
            {
                var passengers = await _bookingIntegrationService.GetPassengersFromBookingsAsync(tripScheduleId, travelDate);
                return Ok(passengers);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Failed to get passengers from bookings: {ex.Message}");
                return BadRequest(new { message = "Error retrieving passengers from bookings", error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<ActionResult<Trip>> Create([FromBody] Trip trip)
        {
            try
            {
                trip.Id = Guid.NewGuid();
                trip.CreatedAt = DateTime.UtcNow;
                
                // Set IDs for passengers
                foreach (var passenger in trip.Passengers)
                {
                    passenger.Id = Guid.NewGuid();
                    passenger.TripId = trip.Id;
                }
                
                _context.Set<Trip>().Add(trip);
                await _context.SaveChangesAsync();

                // Send notification to vehicle owner about trip completion
                try
                {
                    var routeName = trip.RouteId.HasValue
                        ? await _context.Set<Route>().Where(r => r.Id == trip.RouteId.Value).Select(r => r.Name).FirstOrDefaultAsync()
                        : "Unknown Route";

                    await _notificationService.NotifyTripCompleted(
                        trip.VehicleId,
                        trip.Id,
                        trip.PassengerCount,
                        trip.TotalFare,
                        trip.TripDate,
                        routeName ?? "Unknown Route");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[TripDetails] Failed to send owner notification: {ex.Message}");
                }
                
                // Reload with includes
                var createdTrip = await _context.Set<Trip>()
                    .Include(t => t.Passengers)
                    .FirstOrDefaultAsync(t => t.Id == trip.Id);
                
                return CreatedAtAction(nameof(GetById), new { id = trip.Id }, createdTrip);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Failed to create trip: {ex.Message}");
                Console.WriteLine($"[ERROR] Inner exception: {ex.InnerException?.Message}");
                Console.WriteLine($"[ERROR] Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { error = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(Guid id)
        {
            var trip = await _context.Set<Trip>().FindAsync(id);
            if (trip == null)
                return NotFound();
            
            _context.Set<Trip>().Remove(trip);
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }

    public class CreateDailyTaxiQueueDto
    {
        public Guid TaxiRankId { get; set; }
        public Guid VehicleId { get; set; }
        public Guid? DriverId { get; set; }
        public Guid TenantId { get; set; }
        public DateTime QueueDate { get; set; }
        public TimeSpan AvailableFrom { get; set; }
        public TimeSpan? AvailableUntil { get; set; }
        public int? Priority { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdateDailyTaxiQueueDto
    {
        public TimeSpan? AvailableFrom { get; set; }
        public TimeSpan? AvailableUntil { get; set; }
        public int? Priority { get; set; }
        public string? Status { get; set; }
        public string? Notes { get; set; }
    }

    public class AssignTaxiToTripDto
    {
        public Guid TripId { get; set; }
        public Guid AssignedByUserId { get; set; }
    }
}
