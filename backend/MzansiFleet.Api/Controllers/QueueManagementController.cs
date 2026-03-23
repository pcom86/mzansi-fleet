#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Repository;
using MzansiFleet.Domain.Entities;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.SignalR;
using MzansiFleet.Api.Hubs;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QueueManagementController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;
        private readonly ILogger<QueueManagementController> _logger;
        private readonly IHubContext<QueueHub> _hubContext;

        public QueueManagementController(
            MzansiFleetDbContext context, 
            ILogger<QueueManagementController> logger,
            IHubContext<QueueHub> hubContext)
        {
            _context = context;
            _logger = logger;
            _hubContext = hubContext;
        }

        // GET: api/QueueManagement/overview/{rankId}
        [HttpGet("overview/{rankId}")]
        public async Task<ActionResult<QueueOverviewDto>> GetQueueOverview(Guid rankId, [FromQuery] DateTime? date)
        {
            var targetDate = date ?? DateTime.UtcNow.Date;
            
            _logger.LogInformation($"Loading queue overview for TaxiRankId: {rankId}, Date: {targetDate:yyyy-MM-dd}");
            
            // Debug: Check what queue entries exist for this taxi rank
            var allQueueEntries = await _context.DailyTaxiQueues
                .Where(q => q.TaxiRankId == rankId && q.QueueDate == targetDate)
                .Include(q => q.Route)
                .Include(q => q.Vehicle)
                .ToListAsync();
                
            _logger.LogInformation($"Found {allQueueEntries.Count} total queue entries for taxi rank");
            
            foreach (var entry in allQueueEntries)
            {
                _logger.LogInformation($"Queue Entry - Vehicle: {entry.Vehicle?.Registration ?? "Unknown"}, Route: {entry.Route?.RouteName ?? "No Route"}, RouteId: {entry.RouteId}, Status: {entry.Status}");
            }
            
            var queues = await _context.DailyTaxiQueues
                .Where(q => q.TaxiRankId == rankId && q.QueueDate == targetDate && q.RouteId.HasValue)
                .Include(q => q.Route)
                .Include(q => q.Vehicle)
                .Include(q => q.Driver)
                .Where(q => q.Route != null && q.Vehicle != null && q.Route.TaxiRankId == rankId) // Ensure valid relationships and route belongs to taxi rank
                .GroupBy(q => q.RouteId!.Value)
                .Select(g => new RouteQueueDto
                {
                    RouteId = g.Key,
                    RouteName = g.Where(q => q.Route != null).Select(q => q.Route.RouteName).FirstOrDefault() ?? "Unknown Route",
                    TotalVehicles = g.Count(),
                    WaitingVehicles = g.Count(q => q.Status == "Waiting"),
                    LoadingVehicles = g.Count(q => q.Status == "Loading"),
                    DispatchedVehicles = g.Count(q => q.Status == "Dispatched"),
                    AverageWaitTime = g.Where(q => q.Status == "Dispatched" && q.DepartedAt.HasValue)
                        .Select(q => (q.DepartedAt.Value - q.QueueDate.Date.Add(q.JoinedAt)).TotalMinutes)
                        .DefaultIfEmpty(0)
                        .Average(),
                    NextVehicle = g.Where(q => q.Status == "Waiting")
                        .OrderBy(q => q.QueuePosition)
                        .Select(q => new VehicleQueueDto
                        {
                            Id = q.Id,
                            VehicleRegistration = q.Vehicle.Registration,
                            DriverName = q.Driver != null ? q.Driver.Name : "Unassigned",
                            QueuePosition = q.QueuePosition,
                            JoinedAt = q.JoinedAt,
                            PassengerCapacity = q.Vehicle.Capacity
                        })
                        .FirstOrDefault()
                })
                .ToListAsync();

            var totalStats = await GetQueueStats(rankId, targetDate);

            return Ok(new QueueOverviewDto
            {
                TaxiRankId = rankId,
                Date = targetDate,
                RouteQueues = queues,
                TotalStats = totalStats
            });
        }

        // GET: api/QueueManagement/vehicle-availability/{rankId}
        [HttpGet("vehicle-availability/{rankId}")]
        public async Task<ActionResult<List<AvailableVehicleDto>>> GetAvailableVehicles(Guid rankId)
        {
            var availableVehicles = await _context.Vehicles
                .Where(v => v.TaxiRankId == rankId && v.Status == "Active")
                .Where(v => !_context.DailyTaxiQueues
                    .Any(q => q.VehicleId == v.Id 
                        && q.QueueDate == DateTime.UtcNow.Date
                        && (q.Status == "Waiting" || q.Status == "Loading")))
                .Select(v => new AvailableVehicleDto
                {
                    VehicleId = v.Id,
                    Registration = v.Registration,
                    Make = v.Make,
                    Model = v.Model,
                    Capacity = v.Capacity,
                    VehicleType = v.Type,
                    CurrentStatus = "Available"
                })
                .ToListAsync();

            return Ok(availableVehicles);
        }

        // POST: api/QueueManagement/assign-vehicle
        [HttpPost("assign-vehicle")]
        public async Task<ActionResult> AssignVehicleToQueue([FromBody] AssignVehicleDto dto)
        {
            var today = DateTime.UtcNow.Date;

            // Validate vehicle availability
            var isVehicleAvailable = await _context.Vehicles
                .Where(v => v.Id == dto.VehicleId && v.TaxiRankId == dto.TaxiRankId && v.Status == "Active")
                .AllAsync(v => !_context.DailyTaxiQueues
                    .Any(q => q.VehicleId == v.Id 
                        && q.QueueDate == today
                        && (q.Status == "Waiting" || q.Status == "Loading")));

            if (!isVehicleAvailable)
                return BadRequest(new { message = "Vehicle is not available or already in queue" });

            // Get next queue position
            var maxPosition = await _context.DailyTaxiQueues
                .Where(q => q.TaxiRankId == dto.TaxiRankId
                    && q.RouteId == dto.RouteId
                    && q.QueueDate == today
                    && q.Status != "Dispatched" && q.Status != "Removed")
                .MaxAsync(q => (int?)q.QueuePosition) ?? 0;

            var queueEntry = new DailyTaxiQueue
            {
                Id = Guid.NewGuid(),
                TaxiRankId = dto.TaxiRankId,
                RouteId = dto.RouteId,
                VehicleId = dto.VehicleId,
                DriverId = dto.DriverId,
                TenantId = dto.TenantId,
                QueueDate = today,
                QueuePosition = maxPosition + 1,
                JoinedAt = DateTime.UtcNow.TimeOfDay,
                Status = "Waiting",
                EstimatedDepartureTime = dto.EstimatedDepartureTime,
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow
            };

            _context.DailyTaxiQueues.Add(queueEntry);
            await _context.SaveChangesAsync();

            // Notify clients of queue update
            await _hubContext.Clients.Group($"rank_{dto.TaxiRankId}")
                .SendAsync("QueueUpdated", new { routeId = dto.RouteId, action = "vehicle_assigned" });

            return Ok(new { message = "Vehicle assigned to queue successfully", queueEntry.Id });
        }

        // POST: api/QueueManagement/bulk-assign
        [HttpPost("bulk-assign")]
        public async Task<ActionResult> BulkAssignVehicles([FromBody] BulkAssignDto dto)
        {
            var results = new List<object>();
            var today = DateTime.UtcNow.Date;

            foreach (var assignment in dto.Assignments)
            {
                try
                {
                    var result = await AssignVehicleToQueueInternal(assignment, today);
                    results.Add(new { vehicleId = assignment.VehicleId, success = true, queueId = result });
                }
                catch (Exception ex)
                {
                    results.Add(new { vehicleId = assignment.VehicleId, success = false, error = ex.Message });
                }
            }

            // Bulk notification
            await _hubContext.Clients.Group($"rank_{dto.TaxiRankId}")
                .SendAsync("BulkQueueUpdate", new { assignments = results.Count, timestamp = DateTime.UtcNow });

            return Ok(new { message = "Bulk assignment completed", results });
        }

        // PUT: api/QueueManagement/priority-dispatch/{queueId}
        [HttpPut("priority-dispatch/{queueId}")]
        public async Task<ActionResult> PriorityDispatch(Guid queueId, [FromBody] PriorityDispatchDto dto)
        {
            var queueEntry = await _context.DailyTaxiQueues
                .Include(q => q.Route)
                .Include(q => q.Vehicle)
                .Include(q => q.Driver)
                .FirstOrDefaultAsync(q => q.Id == queueId);

            if (queueEntry == null)
                return NotFound(new { message = "Queue entry not found" });

            if (queueEntry.Status == "Dispatched")
                return BadRequest(new { message = "Vehicle already dispatched" });

            // Update status
            queueEntry.Status = "Dispatched";
            queueEntry.DepartedAt = DateTime.UtcNow;
            queueEntry.DispatchedByUserId = dto.DispatchedByUserId;
            queueEntry.PassengerCount = dto.PassengerCount;
            queueEntry.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Reorder remaining queue
            await ReorderQueueAfterDispatch(queueEntry);

            // Send priority dispatch notification
            await _hubContext.Clients.Group($"rank_{queueEntry.TaxiRankId}")
                .SendAsync("PriorityDispatch", new 
                { 
                    queueId = queueEntry.Id,
                    vehicleRegistration = queueEntry.Vehicle?.Registration ?? "Unknown",
                    routeName = queueEntry.Route?.RouteName ?? "No Route",
                    dispatchedAt = queueEntry.DepartedAt,
                    priority = dto.Priority
                });

            return Ok(new { message = "Vehicle dispatched with priority", queueEntry.Id });
        }

        // GET: api/QueueManagement/analytics/{rankId}
        [HttpGet("analytics/{rankId}")]
        public async Task<ActionResult<QueueAnalyticsDto>> GetQueueAnalytics(Guid rankId, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            var start = startDate ?? DateTime.UtcNow.Date.AddDays(-7);
            var end = endDate ?? DateTime.UtcNow.Date;

            var queueData = await _context.DailyTaxiQueues
                .Where(q => q.TaxiRankId == rankId && q.QueueDate >= start && q.QueueDate <= end)
                .Include(q => q.Route)
                .Include(q => q.Vehicle)
                .ToListAsync();

            var analytics = new QueueAnalyticsDto
            {
                PeriodStart = start,
                PeriodEnd = end,
                TotalVehiclesProcessed = queueData.Count(q => q.Status == "Dispatched"),
                AverageQueueLength = queueData.GroupBy(q => q.QueueDate)
                    .Select(g => g.Count(q => q.Status != "Dispatched" && q.Status != "Removed"))
                    .DefaultIfEmpty(0)
                    .Average(),
                AverageWaitTime = queueData
                    .Where(q => q.Status == "Dispatched" && q.DepartedAt.HasValue)
                    .Select(q => (q.DepartedAt!.Value - q.CreatedAt).TotalMinutes)
                    .DefaultIfEmpty(0)
                    .Average(),
                PeakHours = GetPeakHours(queueData),
                RoutePerformance = GetRoutePerformance(queueData),
                DailyTrends = GetDailyTrends(queueData)
            };

            return Ok(analytics);
        }

        private async Task<QueueStatsDto> GetQueueStats(Guid rankId, DateTime date)
        {
            var entries = await _context.DailyTaxiQueues
                .Where(q => q.TaxiRankId == rankId && q.QueueDate == date)
                .ToListAsync();

            return new QueueStatsDto
            {
                Waiting = entries.Count(e => e.Status == "Waiting"),
                Loading = entries.Count(e => e.Status == "Loading"),
                Dispatched = entries.Count(e => e.Status == "Dispatched"),
                Removed = entries.Count(e => e.Status == "Removed"),
                TotalPassengers = entries.Where(e => e.Status == "Dispatched").Sum(e => e.PassengerCount),
                AverageWaitMinutes = entries
                    .Where(e => e.Status == "Dispatched" && e.DepartedAt.HasValue)
                    .Select(e => (e.DepartedAt!.Value - e.CreatedAt).TotalMinutes)
                    .DefaultIfEmpty(0)
                    .Average()
            };
        }

        private async Task<Guid> AssignVehicleToQueueInternal(VehicleAssignmentDto assignment, DateTime date)
        {
            var maxPosition = await _context.DailyTaxiQueues
                .Where(q => q.TaxiRankId == assignment.TaxiRankId
                    && q.RouteId == assignment.RouteId
                    && q.QueueDate == date
                    && q.Status != "Dispatched" && q.Status != "Removed")
                .MaxAsync(q => (int?)q.QueuePosition) ?? 0;

            var queueEntry = new DailyTaxiQueue
            {
                Id = Guid.NewGuid(),
                TaxiRankId = assignment.TaxiRankId,
                RouteId = assignment.RouteId,
                VehicleId = assignment.VehicleId,
                DriverId = assignment.DriverId,
                TenantId = assignment.TenantId,
                QueueDate = date,
                QueuePosition = maxPosition + 1,
                JoinedAt = DateTime.UtcNow.TimeOfDay,
                Status = "Waiting",
                Notes = assignment.Notes,
                CreatedAt = DateTime.UtcNow
            };

            _context.DailyTaxiQueues.Add(queueEntry);
            await _context.SaveChangesAsync();

            return queueEntry.Id;
        }

        private async Task ReorderQueueAfterDispatch(DailyTaxiQueue dispatchedEntry)
        {
            var remaining = await _context.DailyTaxiQueues
                .Where(q => q.TaxiRankId == dispatchedEntry.TaxiRankId
                    && q.RouteId == dispatchedEntry.RouteId
                    && q.QueueDate == dispatchedEntry.QueueDate
                    && q.QueuePosition > dispatchedEntry.QueuePosition
                    && q.Status != "Dispatched" && q.Status != "Removed")
                .OrderBy(q => q.QueuePosition)
                .ToListAsync();

            foreach (var entry in remaining)
            {
                entry.QueuePosition--;
                entry.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
        }

        private List<HourlyStatsDto> GetPeakHours(List<DailyTaxiQueue> queueData)
        {
            return queueData
                .Where(q => q.Status == "Dispatched" && q.DepartedAt.HasValue)
                .GroupBy(q => q.DepartedAt!.Value.Hour)
                .Select(g => new HourlyStatsDto
                {
                    Hour = g.Key,
                    DispatchCount = g.Count(),
                    AverageWaitTime = g.Average(q => (q.DepartedAt!.Value - q.CreatedAt).TotalMinutes)
                })
                .OrderByDescending(h => h.DispatchCount)
                .Take(5)
                .ToList();
        }

        private List<RoutePerformanceDto> GetRoutePerformance(List<DailyTaxiQueue> queueData)
        {
            return queueData
                .GroupBy(q => q.RouteId)
                .Select(g => new RoutePerformanceDto
                {
                    RouteId = g.Key,
                    RouteName = g.Where(q => q.Route != null).Select(q => q.Route.RouteName).FirstOrDefault() ?? "Unknown Route",
                    TotalDispatches = g.Count(q => q.Status == "Dispatched"),
                    AverageWaitTime = g
                        .Where(q => q.Status == "Dispatched" && q.DepartedAt.HasValue)
                        .Select(q => (q.DepartedAt!.Value - q.CreatedAt).TotalMinutes)
                        .DefaultIfEmpty(0)
                        .Average(),
                    UtilizationRate = (double)g.Count(q => q.Status == "Dispatched") / g.Count() * 100
                })
                .ToList();
        }

        private List<DailyTrendDto> GetDailyTrends(List<DailyTaxiQueue> queueData)
        {
            return queueData
                .GroupBy(q => q.QueueDate)
                .Select(g => new DailyTrendDto
                {
                    Date = g.Key,
                    TotalVehicles = g.Count(),
                    DispatchedVehicles = g.Count(q => q.Status == "Dispatched"),
                    AverageQueueLength = g.Count(q => q.Status == "Waiting"),
                    PeakWaitTime = g
                        .Where(q => q.Status == "Dispatched" && q.DepartedAt.HasValue)
                        .Select(q => (q.DepartedAt!.Value - q.CreatedAt).TotalMinutes)
                        .DefaultIfEmpty(0)
                        .Max()
                })
                .OrderBy(d => d.Date)
                .ToList();
        }
    }

    // DTOs
    public class QueueOverviewDto
    {
        public Guid TaxiRankId { get; set; }
        public DateTime Date { get; set; }
        public List<RouteQueueDto> RouteQueues { get; set; } = new();
        public QueueStatsDto TotalStats { get; set; }
    }

    public class RouteQueueDto
    {
        public Guid? RouteId { get; set; }
        public string? RouteName { get; set; }
        public int TotalVehicles { get; set; }
        public int WaitingVehicles { get; set; }
        public int LoadingVehicles { get; set; }
        public int DispatchedVehicles { get; set; }
        public double AverageWaitTime { get; set; }
        public VehicleQueueDto? NextVehicle { get; set; }
    }

    public class VehicleQueueDto
    {
        public Guid Id { get; set; }
        public string VehicleRegistration { get; set; } = string.Empty;
        public string DriverName { get; set; } = string.Empty;
        public int QueuePosition { get; set; }
        public TimeSpan JoinedAt { get; set; }
        public int PassengerCapacity { get; set; }
    }

    public class QueueStatsDto
    {
        public int Waiting { get; set; }
        public int Loading { get; set; }
        public int Dispatched { get; set; }
        public int Removed { get; set; }
        public int TotalPassengers { get; set; }
        public double AverageWaitMinutes { get; set; }
    }

    public class AvailableVehicleDto
    {
        public Guid VehicleId { get; set; }
        public string Registration { get; set; } = string.Empty;
        public string Make { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public string VehicleType { get; set; } = string.Empty;
        public string CurrentStatus { get; set; } = string.Empty;
    }

    public class AssignVehicleDto
    {
        public Guid TaxiRankId { get; set; }
        public Guid? RouteId { get; set; }
        public Guid VehicleId { get; set; }
        public Guid? DriverId { get; set; }
        public Guid TenantId { get; set; }
        public DateTime? EstimatedDepartureTime { get; set; }
        public string? Notes { get; set; }
    }

    public class VehicleAssignmentDto
    {
        public Guid TaxiRankId { get; set; }
        public Guid? RouteId { get; set; }
        public Guid VehicleId { get; set; }
        public Guid? DriverId { get; set; }
        public Guid TenantId { get; set; }
        public string? Notes { get; set; }
    }

    public class BulkAssignDto
    {
        public Guid TaxiRankId { get; set; }
        public List<VehicleAssignmentDto> Assignments { get; set; } = new();
    }

    public class PriorityDispatchDto
    {
        public Guid? DispatchedByUserId { get; set; }
        public int PassengerCount { get; set; }
        public string Priority { get; set; } = "Normal";
        public string? Reason { get; set; }
    }

    public class QueueAnalyticsDto
    {
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public int TotalVehiclesProcessed { get; set; }
        public double AverageQueueLength { get; set; }
        public double AverageWaitTime { get; set; }
        public List<HourlyStatsDto> PeakHours { get; set; } = new();
        public List<RoutePerformanceDto> RoutePerformance { get; set; } = new();
        public List<DailyTrendDto> DailyTrends { get; set; } = new();
    }

    public class HourlyStatsDto
    {
        public int Hour { get; set; }
        public int DispatchCount { get; set; }
        public double AverageWaitTime { get; set; }
    }

    public class RoutePerformanceDto
    {
        public Guid? RouteId { get; set; }
        public string? RouteName { get; set; }
        public int TotalDispatches { get; set; }
        public double AverageWaitTime { get; set; }
        public double UtilizationRate { get; set; }
    }

    public class DailyTrendDto
    {
        public DateTime Date { get; set; }
        public int TotalVehicles { get; set; }
        public int DispatchedVehicles { get; set; }
        public int AverageQueueLength { get; set; }
        public double PeakWaitTime { get; set; }
    }
}
