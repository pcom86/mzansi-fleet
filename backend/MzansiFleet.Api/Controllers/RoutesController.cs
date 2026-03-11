using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Repository;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RoutesController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public RoutesController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Get unique routes for a taxi rank (extracted from schedules)
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<RouteDto>>> GetRoutes([FromQuery] Guid taxiRankId)
        {
            if (taxiRankId == Guid.Empty)
                return BadRequest(new { message = "taxiRankId is required" });

            // Get active schedules for this taxi rank
            var schedules = await _context.Routes
                .Include(s => s.Stops)
                .Include(s => s.RouteVehicles.Where(rv => rv.IsActive))
                    .ThenInclude(rv => rv.Vehicle)
                .Where(s => s.TaxiRankId == taxiRankId && s.IsActive)
                .OrderBy(s => s.RouteName)
                .ToListAsync();

            // Group by route name + stations to get unique routes
            var routeGroups = schedules
                .GroupBy(s => new { s.RouteName, s.DepartureStation, s.DestinationStation })
                .Select(g => new RouteDto
                {
                    Id = g.First().Id, // Use first schedule ID as route ID
                    RouteName = g.Key.RouteName,
                    DepartureStation = g.Key.DepartureStation,
                    DestinationStation = g.Key.DestinationStation,
                    StandardFare = g.First().StandardFare,
                    ExpectedDurationMinutes = g.First().ExpectedDurationMinutes,
                    MaxPassengers = g.First().MaxPassengers,
                    IsActive = true,
                    // Aggregate stops from all schedules with same route
                    Stops = g.SelectMany(s => s.Stops)
                        .GroupBy(stop => stop.StopName)
                        .Select(stopGroup => new RouteStopDto
                        {
                            StopName = stopGroup.Key,
                            StopOrder = stopGroup.First().StopOrder,
                            FareFromOrigin = stopGroup.First().FareFromOrigin,
                            EstimatedMinutesFromDeparture = stopGroup.First().EstimatedMinutesFromDeparture,
                            StopNotes = stopGroup.First().StopNotes
                        })
                        .OrderBy(s => s.StopOrder)
                        .ToList(),
                    // Aggregate vehicles from all schedules with same route
                    Vehicles = g.SelectMany(s => s.RouteVehicles)
                        .Where(rv => rv.IsActive && rv.Vehicle != null)
                        .GroupBy(rv => rv.VehicleId)
                        .Select(vg => new VehicleDto
                        {
                            Id = vg.Key,
                            Registration = vg.First().Vehicle!.Registration,
                            Make = vg.First().Vehicle!.Make,
                            Model = vg.First().Vehicle!.Model,
                            Capacity = vg.First().Vehicle!.Capacity
                        })
                        .ToList()
                })
                .ToList();

            return Ok(routeGroups);
        }

        /// <summary>
        /// Get a specific route by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<RouteDto>> GetRoute(Guid id)
        {
            var schedule = await _context.Routes
                .Include(s => s.Stops)
                .Include(s => s.RouteVehicles.Where(rv => rv.IsActive))
                    .ThenInclude(rv => rv.Vehicle)
                .FirstOrDefaultAsync(s => s.Id == id && s.IsActive);

            if (schedule == null)
                return NotFound(new { message = "Route not found" });

            // Get all schedules with same route name to aggregate stops/vehicles
            var relatedSchedules = await _context.Routes
                .Include(s => s.Stops)
                .Include(s => s.RouteVehicles.Where(rv => rv.IsActive))
                    .ThenInclude(rv => rv.Vehicle)
                .Where(s => s.TaxiRankId == schedule.TaxiRankId 
                    && s.RouteName == schedule.RouteName
                    && s.DepartureStation == schedule.DepartureStation
                    && s.DestinationStation == schedule.DestinationStation
                    && s.IsActive)
                .ToListAsync();

            var route = new RouteDto
            {
                Id = schedule.Id,
                RouteName = schedule.RouteName,
                DepartureStation = schedule.DepartureStation,
                DestinationStation = schedule.DestinationStation,
                StandardFare = schedule.StandardFare,
                ExpectedDurationMinutes = schedule.ExpectedDurationMinutes,
                MaxPassengers = schedule.MaxPassengers,
                IsActive = schedule.IsActive,
                Stops = relatedSchedules
                    .SelectMany(s => s.Stops)
                    .GroupBy(stop => stop.StopName)
                    .Select(g => new RouteStopDto
                    {
                        StopName = g.Key,
                        StopOrder = g.First().StopOrder,
                        FareFromOrigin = g.First().FareFromOrigin,
                        EstimatedMinutesFromDeparture = g.First().EstimatedMinutesFromDeparture,
                        StopNotes = g.First().StopNotes
                    })
                    .OrderBy(s => s.StopOrder)
                    .ToList(),
                Vehicles = relatedSchedules
                    .SelectMany(s => s.RouteVehicles)
                    .Where(rv => rv.IsActive && rv.Vehicle != null)
                    .GroupBy(rv => rv.VehicleId)
                    .Select(g => new VehicleDto
                    {
                        Id = g.Key,
                        Registration = g.First().Vehicle!.Registration,
                        Make = g.First().Vehicle!.Make,
                        Model = g.First().Vehicle!.Model,
                        Capacity = g.First().Vehicle!.Capacity
                    })
                    .ToList()
            };

            return Ok(route);
        }

        /// <summary>
        /// Create a new route (creates a Route internally)
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<RouteDto>> CreateRoute([FromBody] CreateRouteDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var schedule = new Route
            {
                Id = Guid.NewGuid(),
                TaxiRankId = dto.TaxiRankId,
                TenantId = dto.TenantId,
                RouteName = dto.RouteName,
                DepartureStation = dto.DepartureStation,
                DestinationStation = dto.DestinationStation,
                DepartureTime = dto.DepartureTime ?? TimeSpan.FromHours(8),
                FrequencyMinutes = dto.FrequencyMinutes ?? 60,
                DaysOfWeek = dto.DaysOfWeek ?? "1,2,3,4,5",
                StandardFare = dto.StandardFare,
                ExpectedDurationMinutes = dto.ExpectedDurationMinutes,
                MaxPassengers = dto.MaxPassengers ?? 16,
                IsActive = true,
                Notes = dto.Notes
            };

            _context.Routes.Add(schedule);

            // Add stops if provided
            if (dto.Stops?.Any() == true)
            {
                var stops = dto.Stops.Select((s, i) => new RouteStop
                {
                    Id = Guid.NewGuid(),
                    RouteId = schedule.Id,
                    StopName = s.StopName,
                    StopOrder = s.StopOrder > 0 ? s.StopOrder : i + 1,
                    FareFromOrigin = s.FareFromOrigin,
                    EstimatedMinutesFromDeparture = s.EstimatedMinutesFromDeparture,
                    StopNotes = s.StopNotes
                }).ToList();

                _context.RouteStops.AddRange(stops);
            }

            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRoute), new { id = schedule.Id }, new RouteDto
            {
                Id = schedule.Id,
                RouteName = schedule.RouteName,
                DepartureStation = schedule.DepartureStation,
                DestinationStation = schedule.DestinationStation,
                StandardFare = schedule.StandardFare,
                ExpectedDurationMinutes = schedule.ExpectedDurationMinutes,
                MaxPassengers = schedule.MaxPassengers,
                IsActive = schedule.IsActive,
                Stops = dto.Stops?.Select(s => new RouteStopDto
                {
                    StopName = s.StopName,
                    StopOrder = s.StopOrder,
                    FareFromOrigin = s.FareFromOrigin,
                    EstimatedMinutesFromDeparture = s.EstimatedMinutesFromDeparture,
                    StopNotes = s.StopNotes
                }).ToList() ?? new List<RouteStopDto>()
            });
        }

        /// <summary>
        /// Update an existing route
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<RouteDto>> UpdateRoute(Guid id, [FromBody] UpdateRouteDto dto)
        {
            var schedule = await _context.Routes
                .Include(s => s.Stops)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (schedule == null)
                return NotFound(new { message = "Route not found" });

            // Update fields
            if (!string.IsNullOrEmpty(dto.RouteName))
                schedule.RouteName = dto.RouteName;
            if (!string.IsNullOrEmpty(dto.DepartureStation))
                schedule.DepartureStation = dto.DepartureStation;
            if (!string.IsNullOrEmpty(dto.DestinationStation))
                schedule.DestinationStation = dto.DestinationStation;
            if (dto.StandardFare.HasValue)
                schedule.StandardFare = dto.StandardFare.Value;
            if (dto.ExpectedDurationMinutes.HasValue)
                schedule.ExpectedDurationMinutes = dto.ExpectedDurationMinutes.Value;
            if (dto.MaxPassengers.HasValue)
                schedule.MaxPassengers = dto.MaxPassengers.Value;
            if (dto.DepartureTime.HasValue)
                schedule.DepartureTime = dto.DepartureTime.Value;
            if (dto.FrequencyMinutes.HasValue)
                schedule.FrequencyMinutes = dto.FrequencyMinutes.Value;
            if (!string.IsNullOrEmpty(dto.DaysOfWeek))
                schedule.DaysOfWeek = dto.DaysOfWeek;
            if (dto.IsActive.HasValue)
                schedule.IsActive = dto.IsActive.Value;
            if (dto.Notes != null)
                schedule.Notes = dto.Notes;

            schedule.UpdatedAt = DateTime.UtcNow;

            // Update stops if provided
            if (dto.Stops != null)
            {
                // Remove existing stops
                var existingStops = _context.RouteStops.Where(s => s.RouteId == id);
                _context.RouteStops.RemoveRange(existingStops);

                // Add new stops
                if (dto.Stops.Any())
                {
                    var newStops = dto.Stops.Select((s, i) => new RouteStop
                    {
                        Id = Guid.NewGuid(),
                        RouteId = schedule.Id,
                        StopName = s.StopName,
                        StopOrder = s.StopOrder > 0 ? s.StopOrder : i + 1,
                        FareFromOrigin = s.FareFromOrigin,
                        EstimatedMinutesFromDeparture = s.EstimatedMinutesFromDeparture,
                        StopNotes = s.StopNotes
                    }).ToList();

                    _context.RouteStops.AddRange(newStops);
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new RouteDto
            {
                Id = schedule.Id,
                RouteName = schedule.RouteName,
                DepartureStation = schedule.DepartureStation,
                DestinationStation = schedule.DestinationStation,
                StandardFare = schedule.StandardFare,
                ExpectedDurationMinutes = schedule.ExpectedDurationMinutes,
                MaxPassengers = schedule.MaxPassengers,
                IsActive = schedule.IsActive
            });
        }

        /// <summary>
        /// Delete a route (soft delete by marking inactive)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteRoute(Guid id)
        {
            var schedule = await _context.Routes.FindAsync(id);

            if (schedule == null)
                return NotFound(new { message = "Route not found" });

            // Soft delete
            schedule.IsActive = false;
            schedule.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Route deleted successfully" });
        }
    }

    // DTOs - reuse RouteStopDto from TaxiRankAdminController
    public class RouteDto
    {
        public Guid Id { get; set; }
        public string RouteName { get; set; } = string.Empty;
        public string DepartureStation { get; set; } = string.Empty;
        public string DestinationStation { get; set; } = string.Empty;
        public decimal StandardFare { get; set; }
        public int? ExpectedDurationMinutes { get; set; }
        public int? MaxPassengers { get; set; }
        public bool IsActive { get; set; }
        public List<RouteStopDto> Stops { get; set; } = new List<RouteStopDto>();
        public List<VehicleDto> Vehicles { get; set; } = new List<VehicleDto>();
    }

    public class VehicleDto
    {
        public Guid Id { get; set; }
        public string Registration { get; set; } = string.Empty;
        public string? Make { get; set; }
        public string? Model { get; set; }
        public int? Capacity { get; set; }
    }

    public class CreateRouteDto
    {
        public Guid TaxiRankId { get; set; }
        public Guid TenantId { get; set; }
        public string RouteName { get; set; } = string.Empty;
        public string DepartureStation { get; set; } = string.Empty;
        public string DestinationStation { get; set; } = string.Empty;
        public decimal StandardFare { get; set; }
        public int? ExpectedDurationMinutes { get; set; }
        public int? MaxPassengers { get; set; }
        public TimeSpan? DepartureTime { get; set; }
        public int? FrequencyMinutes { get; set; }
        public string? DaysOfWeek { get; set; }
        public string? Notes { get; set; }
        public List<RouteStopDto>? Stops { get; set; }
    }

    public class UpdateRouteDto
    {
        public string? RouteName { get; set; }
        public string? DepartureStation { get; set; }
        public string? DestinationStation { get; set; }
        public decimal? StandardFare { get; set; }
        public int? ExpectedDurationMinutes { get; set; }
        public int? MaxPassengers { get; set; }
        public TimeSpan? DepartureTime { get; set; }
        public int? FrequencyMinutes { get; set; }
        public string? DaysOfWeek { get; set; }
        public string? Notes { get; set; }
        public bool? IsActive { get; set; }
        public List<RouteStopDto>? Stops { get; set; }
    }
}

