using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Domain.Constants;
using MzansiFleet.Repository;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BCrypt.Net;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TaxiRankAdminController : ControllerBase
    {
        private readonly ITaxiRankAdminRepository _adminRepository;
        private readonly IUserRepository _userRepository;
        private readonly ITaxiRankRepository _taxiRankRepository;
        private readonly ITaxiMarshalRepository _marshalRepository;
        private readonly IVehicleTaxiRankRepository _vehicleRankRepository;
        private readonly ITripScheduleRepository _scheduleRepository;
        private readonly MzansiFleetDbContext _context;

        public TaxiRankAdminController(
            ITaxiRankAdminRepository adminRepository,
            IUserRepository userRepository,
            ITaxiRankRepository taxiRankRepository,
            ITaxiMarshalRepository marshalRepository,
            IVehicleTaxiRankRepository vehicleRankRepository,
            ITripScheduleRepository scheduleRepository,
            MzansiFleetDbContext context)
        {
            _adminRepository = adminRepository;
            _userRepository = userRepository;
            _taxiRankRepository = taxiRankRepository;
            _marshalRepository = marshalRepository;
            _vehicleRankRepository = vehicleRankRepository;
            _scheduleRepository = scheduleRepository;
            _context = context;
        }

        // GET: api/TaxiRankAdmin
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaxiRankAdminProfile>>> GetAllAdmins()
        {
            var admins = await _adminRepository.GetAllAsync();
            return Ok(admins);
        }

        // GET: api/TaxiRankAdmin/tenant/{tenantId}
        [HttpGet("tenant/{tenantId}")]
        public async Task<ActionResult<IEnumerable<TaxiRankAdminProfile>>> GetAdminsByTenant(Guid tenantId)
        {
            var admins = await _adminRepository.GetByTenantIdAsync(tenantId);
            return Ok(admins);
        }

        // GET: api/TaxiRankAdmin/rank/{taxiRankId}
        [HttpGet("rank/{taxiRankId}")]
        public async Task<ActionResult<IEnumerable<TaxiRankAdminProfile>>> GetAdminsByRank(Guid taxiRankId)
        {
            var admins = await _adminRepository.GetByTaxiRankIdAsync(taxiRankId);
            return Ok(admins);
        }

        // GET: api/TaxiRankAdmin/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<TaxiRankAdminProfile>> GetAdminById(Guid id)
        {
            var admin = await _adminRepository.GetByIdAsync(id);
            if (admin == null)
                return NotFound(new { message = "Admin not found" });

            return Ok(admin);
        }

        // GET: api/TaxiRankAdmin/user/{userId}
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<TaxiRankAdminProfile>> GetAdminByUserId(Guid userId)
        {
            var admin = await _context.TaxiRankAdmins
                .Include(a => a.TaxiRank)
                .FirstOrDefaultAsync(a => a.UserId == userId);
            
            if (admin == null)
                return NotFound(new { message = "Admin profile not found for this user" });

            return Ok(admin);
        }

        // NOTE: Registration moved to TaxiRankUsersController
        // Use POST: api/TaxiRankUsers/register with Role="TaxiRankAdmin"

        // PUT: api/TaxiRankAdmin/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<TaxiRankAdminProfile>> UpdateAdmin(Guid id, [FromBody] UpdateAdminDto dto)
        {
            var admin = await _adminRepository.GetByIdAsync(id);
            if (admin == null)
                return NotFound(new { message = "Admin not found" });

            // Update fields
            if (!string.IsNullOrEmpty(dto.FullName))
                admin.FullName = dto.FullName;
            if (!string.IsNullOrEmpty(dto.PhoneNumber))
                admin.PhoneNumber = dto.PhoneNumber;
            if (!string.IsNullOrEmpty(dto.Address))
                admin.Address = dto.Address;
            if (!string.IsNullOrEmpty(dto.Status))
                admin.Status = dto.Status;
            if (dto.CanManageMarshals.HasValue)
                admin.CanManageMarshals = dto.CanManageMarshals.Value;
            if (dto.CanManageVehicles.HasValue)
                admin.CanManageVehicles = dto.CanManageVehicles.Value;
            if (dto.CanManageSchedules.HasValue)
                admin.CanManageSchedules = dto.CanManageSchedules.Value;
            if (dto.CanViewReports.HasValue)
                admin.CanViewReports = dto.CanViewReports.Value;

            await _adminRepository.UpdateAsync(admin);

            return Ok(admin);
        }

        // POST: api/TaxiRankAdmin/{adminId}/assign-marshal
        [HttpPost("{adminId}/assign-marshal")]
        public async Task<ActionResult> AssignMarshalToRank([FromRoute] Guid adminId, [FromBody] AssignMarshalDto dto)
        {
            var admin = await _adminRepository.GetByIdAsync(adminId);
            if (admin == null)
                return NotFound(new { message = "Admin not found" });

            if (!admin.CanManageMarshals)
                return Forbid("Admin does not have permission to manage marshals");

            var marshal = await _marshalRepository.GetByIdAsync(dto.MarshalId);
            if (marshal == null)
                return NotFound(new { message = "Marshal not found" });

            // Update marshal's taxi rank
            marshal.TaxiRankId = admin.TaxiRankId;
            await _marshalRepository.UpdateAsync(marshal);

            return Ok(new { message = "Marshal assigned to rank successfully" });
        }

        // POST: api/TaxiRankAdmin/{adminId}/assign-vehicle
        [HttpPost("{adminId}/assign-vehicle")]
        public async Task<ActionResult<VehicleTaxiRank>> AssignVehicleToRank([FromRoute] Guid adminId, [FromBody] AssignVehicleDto dto)
        {
            var admin = await _adminRepository.GetByIdAsync(adminId);
            if (admin == null)
                return NotFound(new { message = "Admin not found" });

            if (!admin.CanManageVehicles)
                return Forbid("Admin does not have permission to manage vehicles");

            // Check if vehicle exists
            var vehicle = await _context.Vehicles.FindAsync(dto.VehicleId);
            if (vehicle == null)
                return NotFound(new { message = "Vehicle not found" });

            // Check if vehicle is already assigned to this rank
            var existingAssignment = await _vehicleRankRepository.GetActiveByVehicleIdAsync(dto.VehicleId);
            if (existingAssignment != null && existingAssignment.TaxiRankId == admin.TaxiRankId)
                return BadRequest(new { message = "Vehicle is already assigned to this rank" });

            // Deactivate any existing assignments
            if (existingAssignment != null)
            {
                existingAssignment.IsActive = false;
                existingAssignment.RemovedDate = DateTime.UtcNow;
                await _vehicleRankRepository.UpdateAsync(existingAssignment);
            }

            // Create new assignment
            var assignment = new VehicleTaxiRank
            {
                Id = Guid.NewGuid(),
                VehicleId = dto.VehicleId,
                TaxiRankId = admin.TaxiRankId,
                AssignedDate = DateTime.UtcNow,
                IsActive = true,
                Notes = dto.Notes
            };

            await _vehicleRankRepository.AddAsync(assignment);

            return Ok(assignment);
        }

        // POST: api/TaxiRankAdmin/{adminId}/create-schedule
        [HttpPost("{adminId}/create-schedule")]
        public async Task<ActionResult<TripSchedule>> CreateTripSchedule([FromRoute] Guid adminId, [FromBody] CreateScheduleDto dto)
        {
            var admin = await _adminRepository.GetByIdAsync(adminId);
            if (admin == null)
                return NotFound(new { message = "Admin not found" });

            if (!admin.CanManageSchedules)
                return Forbid("Admin does not have permission to manage schedules");

            var schedule = new TripSchedule
            {
                Id = Guid.NewGuid(),
                TaxiRankId = admin.TaxiRankId,
                TenantId = admin.TenantId,
                RouteName = dto.RouteName,
                DepartureStation = dto.DepartureStation,
                DestinationStation = dto.DestinationStation,
                DepartureTime = dto.DepartureTime,
                FrequencyMinutes = dto.FrequencyMinutes,
                DaysOfWeek = dto.DaysOfWeek,
                StandardFare = dto.StandardFare,
                ExpectedDurationMinutes = dto.ExpectedDurationMinutes,
                MaxPassengers = dto.MaxPassengers,
                IsActive = true,
                Notes = dto.Notes
            };

            await _scheduleRepository.AddAsync(schedule);

            // Save stops
            if (dto.Stops != null && dto.Stops.Count > 0)
            {
                var stops = dto.Stops.Select((s, i) => new RouteStop
                {
                    Id = Guid.NewGuid(),
                    TripScheduleId = schedule.Id,
                    StopName = s.StopName,
                    StopOrder = s.StopOrder > 0 ? s.StopOrder : i + 1,
                    FareFromOrigin = s.FareFromOrigin,
                    EstimatedMinutesFromDeparture = s.EstimatedMinutesFromDeparture,
                    StopNotes = s.StopNotes
                }).ToList();
                _context.RouteStops.AddRange(stops);
                await _context.SaveChangesAsync();
            }

            // Return with stops loaded
            var result = await _context.TripSchedules
                .Include(s => s.Stops)
                .FirstOrDefaultAsync(s => s.Id == schedule.Id);
            return Ok(result);
        }

        // GET: api/TaxiRankAdmin/user/{userId}/schedules
        [HttpGet("user/{userId}/schedules")]
        public async Task<ActionResult<IEnumerable<TripSchedule>>> GetAdminSchedules(Guid userId)
        {
            var admin = await _context.TaxiRankAdmins
                .Include(a => a.TaxiRank)
                .FirstOrDefaultAsync(a => a.UserId == userId);
            
            if (admin == null)
                return NotFound(new { message = "Admin not found for this user" });

            // First try to get schedules for this admin's taxi rank
            var schedules = await _context.TripSchedules
                .Include(s => s.Stops)
                .Include(s => s.RouteVehicles.Where(rv => rv.IsActive))
                    .ThenInclude(rv => rv.Vehicle)
                .Where(s => s.TaxiRankId == admin.TaxiRankId && s.IsActive)
                .OrderBy(s => s.RouteName)
                .ToListAsync();

            // If no schedules found for this rank, return all active schedules
            if (schedules.Count == 0)
            {
                schedules = await _context.TripSchedules
                    .Include(s => s.Stops)
                    .Include(s => s.RouteVehicles.Where(rv => rv.IsActive))
                        .ThenInclude(rv => rv.Vehicle)
                    .Where(s => s.IsActive)
                    .OrderBy(s => s.RouteName)
                    .ToListAsync();
            }

            return Ok(schedules);
        }

        // GET: api/TaxiRankAdmin/{adminId}/vehicles
        [HttpGet("{adminId}/vehicles")]
        public async Task<ActionResult<IEnumerable<VehicleTaxiRank>>> GetAdminVehicles(Guid adminId)
        {
            var admin = await _adminRepository.GetByIdAsync(adminId);
            if (admin == null)
                return NotFound(new { message = "Admin not found" });

            var vehicles = await _vehicleRankRepository.GetByTaxiRankIdAsync(admin.TaxiRankId);
            return Ok(vehicles);
        }

        // GET: api/TaxiRankAdmin/{adminId}/marshals
        [HttpGet("{adminId}/marshals")]
        public async Task<ActionResult<IEnumerable<TaxiMarshalProfile>>> GetAdminMarshals(Guid adminId)
        {
            var admin = await _adminRepository.GetByIdAsync(adminId);
            if (admin == null)
                return NotFound(new { message = "Admin not found" });

            var marshals = await _marshalRepository.GetByTaxiRankIdAsync(admin.TaxiRankId);
            return Ok(marshals);
        }

        // PUT: api/TaxiRankAdmin/{adminId}/update-schedule/{scheduleId}
        [HttpPut("{adminId}/update-schedule/{scheduleId}")]
        public async Task<ActionResult<TripSchedule>> UpdateTripSchedule(Guid adminId, Guid scheduleId, [FromBody] CreateScheduleDto dto)
        {
            var admin = await _adminRepository.GetByIdAsync(adminId);
            if (admin == null)
                return NotFound(new { message = "Admin not found" });

            if (!admin.CanManageSchedules)
                return Forbid("Admin does not have permission to manage schedules");

            var schedule = await _scheduleRepository.GetByIdAsync(scheduleId);
            if (schedule == null)
                return NotFound(new { message = "Schedule not found" });

            if (!string.IsNullOrEmpty(dto.RouteName)) schedule.RouteName = dto.RouteName;
            if (!string.IsNullOrEmpty(dto.DepartureStation)) schedule.DepartureStation = dto.DepartureStation;
            if (!string.IsNullOrEmpty(dto.DestinationStation)) schedule.DestinationStation = dto.DestinationStation;
            if (dto.DepartureTime != default) schedule.DepartureTime = dto.DepartureTime;
            if (dto.FrequencyMinutes > 0) schedule.FrequencyMinutes = dto.FrequencyMinutes;
            if (!string.IsNullOrEmpty(dto.DaysOfWeek)) schedule.DaysOfWeek = dto.DaysOfWeek;
            if (dto.StandardFare > 0) schedule.StandardFare = dto.StandardFare;
            schedule.ExpectedDurationMinutes = dto.ExpectedDurationMinutes ?? schedule.ExpectedDurationMinutes;
            schedule.MaxPassengers = dto.MaxPassengers ?? schedule.MaxPassengers;
            schedule.Notes = dto.Notes ?? schedule.Notes;
            schedule.UpdatedAt = DateTime.UtcNow;

            await _scheduleRepository.UpdateAsync(schedule);

            // Replace stops if provided
            if (dto.Stops != null)
            {
                var existing = _context.RouteStops.Where(s => s.TripScheduleId == scheduleId);
                _context.RouteStops.RemoveRange(existing);
                if (dto.Stops.Count > 0)
                {
                    var newStops = dto.Stops.Select((s, i) => new RouteStop
                    {
                        Id = Guid.NewGuid(),
                        TripScheduleId = scheduleId,
                        StopName = s.StopName,
                        StopOrder = s.StopOrder > 0 ? s.StopOrder : i + 1,
                        FareFromOrigin = s.FareFromOrigin,
                        EstimatedMinutesFromDeparture = s.EstimatedMinutesFromDeparture,
                        StopNotes = s.StopNotes
                    }).ToList();
                    _context.RouteStops.AddRange(newStops);
                }
                await _context.SaveChangesAsync();
            }

            var result = await _context.TripSchedules
                .Include(s => s.Stops)
                .FirstOrDefaultAsync(s => s.Id == scheduleId);
            return Ok(result);
        }

        // DELETE: api/TaxiRankAdmin/{adminId}/delete-schedule/{scheduleId}
        [HttpDelete("{adminId}/delete-schedule/{scheduleId}")]
        public async Task<ActionResult> DeleteTripSchedule(Guid adminId, Guid scheduleId)
        {
            var admin = await _adminRepository.GetByIdAsync(adminId);
            if (admin == null)
                return NotFound(new { message = "Admin not found" });

            if (!admin.CanManageSchedules)
                return Forbid("Admin does not have permission to manage schedules");

            await _scheduleRepository.DeleteAsync(scheduleId);
            return Ok(new { message = "Schedule deleted successfully" });
        }

        // DELETE: api/TaxiRankAdmin/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteAdmin(Guid id)
        {
            var admin = await _adminRepository.GetByIdAsync(id);
            if (admin == null)
                return NotFound(new { message = "Admin not found" });

            await _adminRepository.DeleteAsync(id);
            return Ok(new { message = "Admin deleted successfully" });
        }

        // POST: api/TaxiRankAdmin/{adminId}/schedules/{scheduleId}/assign-vehicle
        [HttpPost("{adminId}/schedules/{scheduleId}/assign-vehicle")]
        public async Task<ActionResult> AssignVehicleToRoute(Guid adminId, Guid scheduleId, [FromBody] AssignVehicleDto dto)
        {
            var admin = await _adminRepository.GetByIdAsync(adminId);
            if (admin == null)
                return NotFound(new { message = "Admin not found" });

            if (!admin.CanManageSchedules)
                return Forbid("Admin does not have permission to manage schedules");

            var schedule = await _context.TripSchedules.FindAsync(scheduleId);
            if (schedule == null)
                return NotFound(new { message = "Schedule not found" });

            // Check if vehicle is already assigned
            var existing = await _context.RouteVehicles
                .FirstOrDefaultAsync(rv => rv.TripScheduleId == scheduleId && rv.VehicleId == dto.VehicleId && rv.IsActive);
            
            if (existing != null)
                return BadRequest(new { message = "Vehicle is already assigned to this route" });

            var routeVehicle = new RouteVehicle
            {
                Id = Guid.NewGuid(),
                TripScheduleId = scheduleId,
                VehicleId = dto.VehicleId,
                AssignedAt = DateTime.UtcNow,
                IsActive = true,
                Notes = dto.Notes
            };

            _context.RouteVehicles.Add(routeVehicle);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Vehicle assigned to route successfully" });
        }

        // DELETE: api/TaxiRankAdmin/{adminId}/schedules/{scheduleId}/unassign-vehicle/{vehicleId}
        [HttpDelete("{adminId}/schedules/{scheduleId}/unassign-vehicle/{vehicleId}")]
        public async Task<ActionResult> UnassignVehicleFromRoute(Guid adminId, Guid scheduleId, Guid vehicleId)
        {
            var admin = await _adminRepository.GetByIdAsync(adminId);
            if (admin == null)
                return NotFound(new { message = "Admin not found" });

            if (!admin.CanManageSchedules)
                return Forbid("Admin does not have permission to manage schedules");

            var routeVehicle = await _context.RouteVehicles
                .FirstOrDefaultAsync(rv => rv.TripScheduleId == scheduleId && rv.VehicleId == vehicleId && rv.IsActive);

            if (routeVehicle == null)
                return NotFound(new { message = "Vehicle assignment not found" });

            routeVehicle.IsActive = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Vehicle unassigned from route successfully" });
        }
    }

    // DTOs
    public class RegisterAdminDto
    {
        public Guid TenantId { get; set; }
        public Guid TaxiRankId { get; set; }
        public string AdminCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string IdNumber { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public DateTime? HireDate { get; set; }
        public bool? CanManageMarshals { get; set; }
        public bool? CanManageVehicles { get; set; }
        public bool? CanManageSchedules { get; set; }
        public bool? CanViewReports { get; set; }
    }

    public class UpdateAdminDto
    {
        public string FullName { get; set; }
        public string PhoneNumber { get; set; }
        public string Address { get; set; }
        public string Status { get; set; }
        public bool? CanManageMarshals { get; set; }
        public bool? CanManageVehicles { get; set; }
        public bool? CanManageSchedules { get; set; }
        public bool? CanViewReports { get; set; }
    }

    public class AssignMarshalDto
    {
        public Guid MarshalId { get; set; }
    }

    public class RouteStopDto
    {
        public string StopName { get; set; } = string.Empty;
        public int StopOrder { get; set; }
        public decimal FareFromOrigin { get; set; }
        public int? EstimatedMinutesFromDeparture { get; set; }
        public string? StopNotes { get; set; }
    }

    public class AssignVehicleDto
    {
        public Guid VehicleId { get; set; }
        public string? Notes { get; set; }
    }

    public class CreateScheduleDto
    {
        public string RouteName { get; set; } = string.Empty;
        public string DepartureStation { get; set; } = string.Empty;
        public string DestinationStation { get; set; } = string.Empty;
        public TimeSpan DepartureTime { get; set; }
        public int FrequencyMinutes { get; set; }
        public string DaysOfWeek { get; set; } = string.Empty;
        public decimal StandardFare { get; set; }
        public int? ExpectedDurationMinutes { get; set; }
        public int? MaxPassengers { get; set; }
        public string Notes { get; set; }
        public List<RouteStopDto>? Stops { get; set; }
    }
}
