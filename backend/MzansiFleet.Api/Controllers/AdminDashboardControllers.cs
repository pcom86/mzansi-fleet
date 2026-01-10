using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Application.DTOs;
using MzansiFleet.Domain.Entities;
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
            route.Code = dto.Code;
            route.Name = dto.Name;
            route.Origin = dto.Origin;
            route.Destination = dto.Destination;
            route.Stops = dto.Stops;
            route.Distance = dto.Distance ?? 0;
            route.EstimatedDuration = dto.EstimatedDuration ?? 0;
            route.FareAmount = dto.FareAmount ?? 0;
            route.Status = dto.Status;

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
                    .ThenInclude(o => o.User)
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
                    .ThenInclude(o => o.User)
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
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetAll()
        {
            // TODO: Implement - Return marshal users with TaxiMarshal role
            return Ok(new List<object>());
        }

        [HttpPost]
        public async Task<ActionResult> Create([FromBody] CreateMarshalDto dto)
        {
            // TODO: Implement - Create user with TaxiMarshal role
            return Ok();
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> Update(Guid id, [FromBody] UpdateMarshalDto dto)
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
