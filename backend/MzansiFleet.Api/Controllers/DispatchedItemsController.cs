#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Repository;
using Microsoft.Extensions.Logging;

namespace MzansiFleet.Api.Controllers
{
    // ── DTOs ─────────────────────────────────────────────────────────────
    
    public class DispatchedItemDto
    {
        public Guid Id { get; set; }
        public string? VehicleRegistration { get; set; }
        public string? VehicleMake { get; set; }
        public string? VehicleModel { get; set; }
        public string? RouteName { get; set; }
        public string? RouteDestination { get; set; }
        public string? DriverName { get; set; }
        public int PassengerCount { get; set; }
        public DateTime? DepartedAt { get; set; }
        public string? Status { get; set; }
    }

    public class DispatchedItemDetailDto : DispatchedItemDto
    {
        public string? DriverPhone { get; set; }
        public string? TaxiRankName { get; set; }
        public string? Notes { get; set; }
        public List<DispatchedPassengerDto>? Passengers { get; set; }
    }

    public class DispatchedPassengerDto
    {
        public string? PassengerName { get; set; }
        public string? PassengerPhone { get; set; }
        public string? NextOfKinName { get; set; }
        public string? NextOfKinContact { get; set; }
        public string? Destination { get; set; }
        public decimal Amount { get; set; }
        public string? PaymentMethod { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class DispatchedItemsController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;
        private readonly ILogger<DispatchedItemsController> _logger;

        public DispatchedItemsController(MzansiFleetDbContext context, ILogger<DispatchedItemsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<List<DispatchedItemDto>>> GetDispatchedItems()
        {
            try
            {
                var dispatchedItems = await _context.DailyTaxiQueues
                    .Where(q => q.Status == "Dispatched")
                    .Include(q => q.Vehicle)
                    .Include(q => q.Route)
                    .Include(q => q.Driver)
                    .Include(q => q.TaxiRank)
                    .Select(q => new DispatchedItemDto
                    {
                        Id = q.Id,
                        VehicleRegistration = q.Vehicle.Registration,
                        VehicleMake = q.Vehicle.Make,
                        VehicleModel = q.Vehicle.Model,
                        RouteName = q.Route.RouteName,
                        RouteDestination = q.Route.DestinationStation,
                        DriverName = q.Driver.Name,
                        PassengerCount = q.PassengerCount,
                        DepartedAt = q.DepartedAt,
                        Status = q.Status
                    })
                    .OrderByDescending(q => q.DepartedAt)
                    .ToListAsync();

                _logger.LogInformation($"[DispatchedItems] Retrieved {dispatchedItems.Count} dispatched items");
                return Ok(dispatchedItems);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[DispatchedItems] Error retrieving dispatched items");
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<DispatchedItemDetailDto>> GetDispatchedItemDetails(Guid id)
        {
            try
            {
                var item = await _context.DailyTaxiQueues
                    .Where(q => q.Id == id && q.Status == "Dispatched")
                    .Include(q => q.Vehicle)
                    .Include(q => q.Route)
                    .Include(q => q.Driver)
                    .Include(q => q.TaxiRank)
                    .FirstOrDefaultAsync();

                if (item == null)
                    return NotFound(new { message = "Dispatched item not found" });

                // Get the trip for this dispatched item
                var trip = await _context.TaxiRankTrips
                    .Where(t => t.VehicleId == item.VehicleId && 
                                   t.DepartureTime >= item.DepartedAt)
                    .Include(t => t.Passengers)
                    .FirstOrDefaultAsync();

                var result = new DispatchedItemDetailDto
                {
                    Id = item.Id,
                    VehicleRegistration = item.Vehicle?.Registration,
                    VehicleMake = item.Vehicle?.Make,
                    VehicleModel = item.Vehicle?.Model,
                    RouteName = item.Route?.RouteName,
                    RouteDestination = item.Route?.DestinationStation,
                    DriverName = item.Driver?.Name,
                    DriverPhone = item.Driver?.Phone,
                    TaxiRankName = item.TaxiRank?.Name,
                    PassengerCount = item.PassengerCount,
                    DepartedAt = item.DepartedAt,
                    Status = item.Status,
                    Notes = item.Notes,
                    Passengers = trip?.Passengers?.Select(p => new DispatchedPassengerDto
                    {
                        PassengerName = p.PassengerName,
                        PassengerPhone = p.PassengerPhone,
                        NextOfKinName = p.NextOfKinName,
                        NextOfKinContact = p.NextOfKinContact,
                        Destination = p.ArrivalStation,
                        Amount = p.Amount,
                        PaymentMethod = p.PaymentMethod
                    }).ToList() ?? new List<DispatchedPassengerDto>()
                };

                _logger.LogInformation($"[DispatchedItems] Retrieved details for dispatched item {id}");
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[DispatchedItems] Error retrieving details for dispatched item {id}");
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }
    }
}
