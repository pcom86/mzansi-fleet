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

            return Ok(schedule);
        }

        // GET: api/TaxiRankAdmin/{adminId}/schedules
        [HttpGet("{adminId}/schedules")]
        public async Task<ActionResult<IEnumerable<TripSchedule>>> GetAdminSchedules(Guid adminId)
        {
            var admin = await _adminRepository.GetByIdAsync(adminId);
            if (admin == null)
                return NotFound(new { message = "Admin not found" });

            var schedules = await _scheduleRepository.GetByTaxiRankIdAsync(admin.TaxiRankId);
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

    public class AssignVehicleDto
    {
        public Guid VehicleId { get; set; }
        public string Notes { get; set; }
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
    }
}
