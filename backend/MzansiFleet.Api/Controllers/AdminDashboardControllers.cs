#nullable enable

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Application.DTOs;
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
        public async Task<ActionResult<IEnumerable<Route>>> GetAll()
        {
            var routes = await _context.Routes.ToListAsync();
            return Ok(routes);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Route>> GetById(Guid id)
        {
            var route = await _context.Routes.FindAsync(id);
            if (route == null)
                return NotFound();

            return Ok(route);
        }

        [HttpPost]
        public async Task<ActionResult<Route>> Create([FromBody] CreateRouteDto dto)
        {
            var route = new Route
            {
                Id = Guid.NewGuid(),
                TenantId = dto.TenantId,
                Code = dto.Code,
                Name = dto.Name,
                Origin = dto.Origin,
                Destination = dto.Destination,
                Stops = dto.Stops,
                Distance = dto.Distance,
                EstimatedDuration = dto.EstimatedDuration,
                FareAmount = dto.FareAmount,
                Status = dto.Status
            };
            
            _context.Routes.Add(route);
            await _context.SaveChangesAsync();
            
            return CreatedAtAction(nameof(GetById), new { id = route.Id }, route);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> Update(Guid id, [FromBody] UpdateRouteDto dto)
        {
            var route = await _context.Routes.FindAsync(id);
            if (route == null)
                return NotFound();

            if (dto.TenantId.HasValue)
                route.TenantId = dto.TenantId.Value;
            route.Code = dto.Code ?? route.Code;
            route.Name = dto.Name ?? route.Name;
            route.Origin = dto.Origin ?? route.Origin;
            route.Destination = dto.Destination ?? route.Destination;
            route.Stops = dto.Stops ?? route.Stops;
            route.Distance = dto.Distance ?? route.Distance;
            route.EstimatedDuration = dto.EstimatedDuration ?? route.EstimatedDuration;
            route.FareAmount = dto.FareAmount ?? route.FareAmount;
            route.Status = dto.Status ?? route.Status;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(Guid id)
        {
            var route = await _context.Routes.FindAsync(id);
            if (route == null)
                return NotFound();

            _context.Routes.Remove(route);
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
        public async Task<ActionResult<IEnumerable<VehicleRouteAssignment>>> GetAll()
        {
            var assignments = await _context.VehicleRouteAssignments
                .Include(a => a.Vehicle)
                .Include(a => a.Route)
                .ToListAsync();
            
            return Ok(assignments);
        }

        [HttpPost]
        public async Task<ActionResult<VehicleRouteAssignment>> Create([FromBody] CreateVehicleRouteAssignmentDto dto)
        {
            var assignment = new VehicleRouteAssignment
            {
                Id = Guid.NewGuid(),
                VehicleId = dto.VehicleId,
                RouteId = dto.RouteId,
                AssignedDate = DateTime.UtcNow,
                Status = "Active"
            };
            
            _context.VehicleRouteAssignments.Add(assignment);
            await _context.SaveChangesAsync();
            
            // Reload with related entities
            var created = await _context.VehicleRouteAssignments
                .Include(a => a.Vehicle)
                .Include(a => a.Route)
                .FirstOrDefaultAsync(a => a.Id == assignment.Id);
            
            return Ok(created);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(Guid id)
        {
            var assignment = await _context.VehicleRouteAssignments.FindAsync(id);
            if (assignment == null)
            {
                return NotFound();
            }
            
            _context.VehicleRouteAssignments.Remove(assignment);
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class TripSchedulesController : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TripSchedule>>> GetAll()
        {
            // TODO: Implement - join with TaxiRank for display details
            return Ok(new List<TripSchedule>());
        }

        [HttpPost]
        public async Task<ActionResult<TripSchedule>> Create([FromBody] CreateTripScheduleDto dto)
        {
            // TODO: Implement
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
                Notes = dto.Notes
            };
            
            return Ok(schedule);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> Update(Guid id, [FromBody] UpdateTripScheduleDto dto)
        {
            // TODO: Implement
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(Guid id)
        {
            // TODO: Implement
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

        public TripDetailsController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Trip>>> GetAll([FromQuery] string? vehicleIds = null)
        {
            var query = _context.Set<Trip>()
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
                }
                
                query = query.Where(t => vehicleIds.Contains(t.VehicleId));
                var afterVehicleFilterCount = await query.CountAsync();
                Console.WriteLine($"Trips after vehicle/tenant filter: {afterVehicleFilterCount}");

                // Optionally filter by taxiRankId if provided
                if (taxiRankId.HasValue)
                {
                    var rankVehicleIds = await _context.Set<VehicleTaxiRank>()
                        .Where(vtr => vtr.TaxiRankId == taxiRankId.Value)
                        .Select(vtr => vtr.VehicleId)
                        .ToListAsync();
                    
                    Console.WriteLine($"Vehicles found for taxi rank: {rankVehicleIds.Count}");
                    query = query.Where(t => rankVehicleIds.Contains(t.VehicleId));
                    var afterRankFilterCount = await query.CountAsync();
                    Console.WriteLine($"Trips after taxi rank filter: {afterRankFilterCount}");
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

        [HttpPost]
        public async Task<ActionResult<Trip>> Create([FromBody] Trip trip)
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
            
            // Reload with includes
            var createdTrip = await _context.Set<Trip>()
                .Include(t => t.Passengers)
                .FirstOrDefaultAsync(t => t.Id == trip.Id);
            
            return CreatedAtAction(nameof(GetById), new { id = trip.Id }, createdTrip);
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
}
