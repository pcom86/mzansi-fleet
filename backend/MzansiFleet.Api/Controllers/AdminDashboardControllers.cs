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
                .Include(a => a.Route)
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
                RouteId = dto.RouteId,
                AssignedAt = DateTime.UtcNow,
                IsActive = true
            };
            
            _context.RouteVehicles.Add(assignment);
            await _context.SaveChangesAsync();
            
            // Reload with related entities
            var created = await _context.RouteVehicles
                .Include(a => a.Vehicle)
                .Include(a => a.Route)
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
        public async Task<ActionResult<IEnumerable<Trip>>> GetAll(
            [FromQuery] string? vehicleIds = null,
            [FromQuery] Guid? tenantId = null,
            [FromQuery] Guid? taxiRankId = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            var query = _context.Trips
                .Include(t => t.Passengers).AsQueryable();

            if (startDate.HasValue)
            {
                var start = startDate.Value.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(startDate.Value.Date, DateTimeKind.Utc)
                    : startDate.Value.ToUniversalTime().Date;
                query = query.Where(t => t.TripDate.Date >= start.Date);
            }

            if (endDate.HasValue)
            {
                var end = endDate.Value.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(endDate.Value.Date, DateTimeKind.Utc)
                    : endDate.Value.ToUniversalTime().Date;
                query = query.Where(t => t.TripDate.Date <= end.Date);
            }

            if (tenantId.HasValue && tenantId.Value != Guid.Empty)
            {
                var tenantVehicleIds = await _context.Set<Vehicle>()
                    .Where(v => v.TenantId == tenantId.Value)
                    .Select(v => v.Id)
                    .ToListAsync();

                query = query.Where(t => tenantVehicleIds.Contains(t.VehicleId));
            }

            if (taxiRankId.HasValue && taxiRankId.Value != Guid.Empty)
            {
                var rankVehicleIds = await _context.Set<VehicleTaxiRank>()
                    .Where(vtr => vtr.TaxiRankId == taxiRankId.Value && vtr.IsActive)
                    .Select(vtr => vtr.VehicleId)
                    .ToListAsync();

                if (rankVehicleIds.Any())
                {
                    query = query.Where(t => rankVehicleIds.Contains(t.VehicleId));
                }
                else
                {
                    return Ok(new List<Trip>());
                }
            }
            
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
                    .ToDictionaryAsync(r => r.Id, r => r.RouteName);

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
        public async Task<ActionResult<IEnumerable<Passenger>>> GetPassengersFromBookings([FromQuery] Guid RouteId, [FromQuery] DateTime travelDate)
        {
            try
            {
                var passengers = await _bookingIntegrationService.GetPassengersFromBookingsAsync(RouteId, travelDate);
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
                        ? await _context.Set<Route>().Where(r => r.Id == trip.RouteId.Value).Select(r => r.RouteName).FirstOrDefaultAsync()
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

