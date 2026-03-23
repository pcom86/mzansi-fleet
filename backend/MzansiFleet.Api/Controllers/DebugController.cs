#nullable enable
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Repository;
using MzansiFleet.Domain.Entities;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DebugController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;
        private readonly ILogger<DebugController> _logger;

        public DebugController(MzansiFleetDbContext context, ILogger<DebugController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("taxi-rank-routes/{taxiRankId}")]
        public async Task<ActionResult> GetTaxiRankRouteDebugInfo(Guid taxiRankId)
        {
            try
            {
                // Get taxi rank info
                var taxiRank = await _context.TaxiRanks.FindAsync(taxiRankId);
                if (taxiRank == null)
                {
                    return NotFound(new { message = $"Taxi rank {taxiRankId} not found" });
                }

                // Get all queue entries for this taxi rank
                var queueEntries = await _context.DailyTaxiQueues
                    .Where(q => q.TaxiRankId == taxiRankId && q.QueueDate == DateTime.UtcNow.Date)
                    .Include(q => q.Route)
                    .Include(q => q.Vehicle)
                    .Include(q => q.Driver)
                    .OrderBy(q => q.RouteId)
                    .ThenBy(q => q.QueuePosition)
                    .ToListAsync();

                // Group by route for analysis
                var routeAnalysis = queueEntries
                    .Where(q => q.RouteId.HasValue)
                    .GroupBy(q => q.RouteId!.Value)
                    .Select(g => new
                    {
                        RouteId = g.Key,
                        RouteName = g.FirstOrDefault()?.Route?.RouteName ?? "Unknown Route",
                        RouteTaxiRankId = g.FirstOrDefault()?.Route?.TaxiRankId,
                        RouteTaxiRankName = g.FirstOrDefault()?.Route?.TaxiRank?.Name ?? "No Taxi Rank",
                        VehicleCount = g.Count(),
                        Statuses = g.GroupBy(q => q.Status)
                                   .ToDictionary(
                                       statusGroup => statusGroup.Key,
                                       statusGroup => statusGroup.Count()
                                   ),
                        Vehicles = g.Select(q => new
                        {
                            q.Id,
                            VehicleRegistration = q.Vehicle?.Registration ?? "Unknown",
                            DriverName = q.Driver?.Name ?? "Unassigned",
                            q.Status,
                            q.QueuePosition,
                            q.JoinedAt
                        }).ToList()
                    })
                    .ToList();

                // Check for data integrity issues
                var integrityIssues = new List<object>();

                // Orphaned routes (routes without taxi rank assignment)
                var orphanedRoutes = queueEntries
                    .Where(q => q.Route == null || q.Route.TaxiRankId == Guid.Empty)
                    .Select(q => new
                    {
                        QueueId = q.Id,
                        VehicleRegistration = q.Vehicle?.Registration,
                        RouteId = q.RouteId,
                        Issue = "Route has no taxi rank assignment"
                    })
                    .ToList();

                if (orphanedRoutes.Any())
                {
                    integrityIssues.Add(new
                    {
                        IssueType = "ORPHANED_ROUTES",
                        Count = orphanedRoutes.Count,
                        Details = orphanedRoutes
                    });
                }

                // Mismatched taxi ranks
                var mismatchedRoutes = queueEntries
                    .Where(q => q.Route != null && q.Route.TaxiRankId != Guid.Empty && q.Route.TaxiRankId != taxiRankId)
                    .Select(q => new
                    {
                        QueueId = q.Id,
                        VehicleRegistration = q.Vehicle?.Registration,
                        RouteId = q.RouteId,
                        RouteName = q.Route?.RouteName,
                        RouteTaxiRankId = q.Route?.TaxiRankId,
                        RouteTaxiRankName = q.Route?.TaxiRank?.Name,
                        QueueTaxiRankId = q.TaxiRankId,
                        QueueTaxiRankName = taxiRank.Name,
                        Issue = "Route belongs to different taxi rank"
                    })
                    .ToList();

                if (mismatchedRoutes.Any())
                {
                    integrityIssues.Add(new
                    {
                        IssueType = "MISMATCHED_TAXI_RANKS",
                        Count = mismatchedRoutes.Count,
                        Details = mismatchedRoutes
                    });
                }

                var debugInfo = new
                {
                    TaxiRank = new
                    {
                        taxiRank.Id,
                        taxiRank.Name,
                        taxiRank.Address,
                        taxiRank.City
                    },
                    QueueDate = DateTime.UtcNow.Date,
                    TotalQueueEntries = queueEntries.Count,
                    RouteAnalysis = routeAnalysis,
                    IntegrityIssues = integrityIssues,
                    Summary = new
                    {
                        TotalRoutes = routeAnalysis.Count,
                        RoutesWithIssues = integrityIssues.Count,
                        HasIntegrityProblems = integrityIssues.Any()
                    }
                };

                _logger.LogInformation($"Debug info generated for TaxiRank: {taxiRank.Name}, Routes: {routeAnalysis.Count}, Issues: {integrityIssues.Count}");

                return Ok(debugInfo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating debug info for taxi rank {taxiRankId}", taxiRankId);
                return StatusCode(500, new { message = "Internal server error", details = ex.Message });
            }
        }

        [HttpGet("all-routes")]
        public async Task<ActionResult> GetAllRoutesDebugInfo()
        {
            try
            {
                var routes = await _context.Routes
                    .Include(r => r.TaxiRank)
                    .OrderBy(r => r.TaxiRankId)
                    .ThenBy(r => r.RouteName)
                    .Select(r => new
                    {
                        r.Id,
                        r.RouteName,
                        r.DepartureStation,
                        r.DestinationStation,
                        TaxiRankId = r.TaxiRankId,
                        TaxiRankName = r.TaxiRank.Name,
                        HasQueueEntries = _context.DailyTaxiQueues
                            .Any(q => q.RouteId == r.Id && q.QueueDate == DateTime.UtcNow.Date)
                    })
                    .ToListAsync();

                var routesByTaxiRank = routes
                    .GroupBy(r => r.TaxiRankId)
                    .ToDictionary(
                        g => g.Key,
                        g => new
                        {
                            TaxiRankName = g.FirstOrDefault()?.TaxiRankName ?? "Unknown",
                            RouteCount = g.Count(),
                            Routes = g.ToList()
                        }
                    );

                return Ok(new
                {
                    TotalRoutes = routes.Count,
                    RoutesByTaxiRank = routesByTaxiRank,
                    RoutesWithQueueEntries = routes.Count(r => r.HasQueueEntries)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all routes debug info");
                return StatusCode(500, new { message = "Internal server error", details = ex.Message });
            }
        }
    }
}
