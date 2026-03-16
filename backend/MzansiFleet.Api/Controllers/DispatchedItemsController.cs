using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Api.DTOs;

namespace MzansiFleet.Api.Controllers
{
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

        [HttpGet("dispatched")]
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
                    .Include(q => q.TripPassengers)
                    .OrderByDescending(q => q.DepartedAt)
                    .ToListAsync();

                var result = dispatchedItems.Select(item => new DispatchedItemDto
                {
                    Id = item.Id,
                    VehicleRegistration = item.Vehicle?.RegistrationNumber,
                    VehicleMake = item.Vehicle?.Make,
                    VehicleModel = item.Vehicle?.Model,
                    RouteName = item.Route?.RouteName,
                    RouteDestination = item.Route?.DestinationStation,
                    DriverName = item.Driver?.FullName,
                    DriverPhone = item.Driver?.PhoneNumber,
                    TaxiRankName = item.TaxiRank?.Name,
                    PassengerCount = item.PassengerCount,
                    DepartedAt = item.DepartedAt,
                    Status = item.Status,
                    Passengers = item.TripPassengers?.Select(p => new PassengerDto
                    {
                        Name = p.PassengerName,
                        Contact = p.PassengerPhone,
                        NextOfKinName = p.NextOfKinName,
                        NextOfKinContact = p.NextOfKinContact,
                        Destination = p.ArrivalStation,
                        Amount = p.Amount,
                        PaymentMethod = p.PaymentMethod
                    }).ToList()
                }).ToList();

                _logger.LogInformation($"[DispatchedItems] Retrieved {result.Count} dispatched items");
                return Ok(result);
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
                    .Include(q => q.TripPassengers)
                    .FirstOrDefaultAsync();

                if (item == null)
                    return NotFound(new { message = "Dispatched item not found" });

                var result = new DispatchedItemDetailDto
                {
                    Id = item.Id,
                    VehicleRegistration = item.Vehicle?.RegistrationNumber,
                    VehicleMake = item.Vehicle?.Make,
                    VehicleModel = item.Vehicle?.Model,
                    RouteName = item.Route?.RouteName,
                    RouteDestination = item.Route?.DestinationStation,
                    DriverName = item.Driver?.FullName,
                    DriverPhone = item.Driver?.PhoneNumber,
                    TaxiRankName = item.TaxiRank?.Name,
                    PassengerCount = item.PassengerCount,
                    DepartedAt = item.DepartedAt,
                    Status = item.Status,
                    Notes = item.Notes,
                    Passengers = item.TripPassengers?.Select(p => new PassengerDto
                    {
                        Name = p.PassengerName,
                        Contact = p.PassengerPhone,
                        NextOfKinName = p.NextOfKinName,
                        NextOfKinContact = p.NextOfKinContact,
                        Destination = p.ArrivalStation,
                        Amount = p.Amount,
                        PaymentMethod = p.PaymentMethod
                    }).ToList()
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

    public class DispatchedItemDto
    {
        public Guid Id { get; set; }
        public string? VehicleRegistration { get; set; }
        public string? VehicleMake { get; set; }
        public string? VehicleModel { get; set; }
        public string? RouteName { get; set; }
        public string? RouteDestination { get; set; }
        public string? DriverName { get; set; }
        public string? DriverPhone { get; set; }
        public string? TaxiRankName { get; set; }
        public int? PassengerCount { get; set; }
        public DateTime? DepartedAt { get; set; }
        public string? Status { get; set; }
        public List<PassengerDto>? Passengers { get; set; }
    }

    public class DispatchedItemDetailDto : DispatchedItemDto
    {
        public string? Notes { get; set; }
    }
}
