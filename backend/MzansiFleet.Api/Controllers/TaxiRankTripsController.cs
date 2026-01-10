using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Repository;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TaxiRankTripsController : ControllerBase
    {
        private readonly ITaxiRankTripRepository _tripRepository;
        private readonly ITripPassengerRepository _passengerRepository;
        private readonly ITripCostRepository _costRepository;
        private readonly IVehicleRepository _vehicleRepository;
        private readonly MzansiFleetDbContext _context;

        public TaxiRankTripsController(
            ITaxiRankTripRepository tripRepository,
            ITripPassengerRepository passengerRepository,
            ITripCostRepository costRepository,
            IVehicleRepository vehicleRepository,
            MzansiFleetDbContext context)
        {
            _tripRepository = tripRepository;
            _passengerRepository = passengerRepository;
            _costRepository = costRepository;
            _vehicleRepository = vehicleRepository;
            _context = context;
        }

        // GET: api/TaxiRankTrips
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaxiRankTrip>>> GetAll([FromQuery] Guid? tenantId = null)
        {
            if (tenantId.HasValue)
            {
                var trips = await _tripRepository.GetByTenantIdAsync(tenantId.Value);
                return Ok(trips);
            }
            
            var allTrips = await _tripRepository.GetAllAsync();
            return Ok(allTrips);
        }

        // GET: api/TaxiRankTrips/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<TaxiRankTrip>> GetById(Guid id)
        {
            var trip = await _tripRepository.GetByIdAsync(id);
            if (trip == null)
                return NotFound();

            return Ok(trip);
        }

        // GET: api/TaxiRankTrips/vehicle/{vehicleId}
        [HttpGet("vehicle/{vehicleId}")]
        public async Task<ActionResult<IEnumerable<TaxiRankTrip>>> GetByVehicle(Guid vehicleId)
        {
            var trips = await _tripRepository.GetByVehicleIdAsync(vehicleId);
            return Ok(trips);
        }

        // GET: api/TaxiRankTrips/driver/{driverId}
        [HttpGet("driver/{driverId}")]
        public async Task<ActionResult<IEnumerable<TaxiRankTrip>>> GetByDriver(Guid driverId)
        {
            var trips = await _tripRepository.GetByDriverIdAsync(driverId);
            return Ok(trips);
        }

        // GET: api/TaxiRankTrips/marshal/{marshalId}
        [HttpGet("marshal/{marshalId}")]
        public async Task<ActionResult<IEnumerable<TaxiRankTrip>>> GetByMarshal(Guid marshalId)
        {
            var trips = await _tripRepository.GetByMarshalIdAsync(marshalId);
            return Ok(trips);
        }

        // POST: api/TaxiRankTrips
        [HttpPost]
        public async Task<ActionResult<TaxiRankTrip>> Create([FromBody] CreateTripDto dto)
        {
            var trip = new TaxiRankTrip
            {
                Id = Guid.NewGuid(),
                TenantId = dto.TenantId,
                VehicleId = dto.VehicleId,
                DriverId = dto.DriverId,
                MarshalId = dto.MarshalId,
                TaxiRankId = dto.TaxiRankId,
                DepartureStation = dto.DepartureStation,
                DestinationStation = dto.DestinationStation,
                DepartureTime = dto.DepartureTime ?? DateTime.UtcNow,
                Status = "Departed",
                PassengerCount = 0,
                TotalAmount = 0,
                TotalCosts = 0,
                NetAmount = 0,
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow
            };

            await _tripRepository.AddAsync(trip);

            // Create initial earnings record
            var earnings = new VehicleEarnings
            {
                Id = Guid.NewGuid(),
                VehicleId = trip.VehicleId,
                Date = trip.DepartureTime,
                Amount = 0, // Will be updated as passengers are added
                Source = $"{trip.DepartureStation} → {trip.DestinationStation}",
                Description = $"Trip from {trip.DepartureStation} to {trip.DestinationStation}",
                Period = "Daily",
                CreatedAt = DateTime.UtcNow
            };

            _context.VehicleEarnings.Add(earnings);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = trip.Id }, trip);
        }

        // POST: api/TaxiRankTrips/{id}/passengers
        [HttpPost("{id}/passengers")]
        public async Task<ActionResult<TripPassenger>> AddPassenger(Guid id, [FromBody] AddPassengerDto dto)
        {
            var trip = await _tripRepository.GetByIdAsync(id);
            if (trip == null)
                return NotFound("Trip not found");

            var passenger = new TripPassenger
            {
                Id = Guid.NewGuid(),
                TaxiRankTripId = id,
                PassengerName = dto.PassengerName,
                PassengerPhone = dto.PassengerPhone,
                DepartureStation = dto.DepartureStation,
                ArrivalStation = dto.ArrivalStation,
                Amount = dto.Amount,
                SeatNumber = dto.SeatNumber,
                Notes = dto.Notes,
                BoardedAt = DateTime.UtcNow
            };

            await _passengerRepository.AddAsync(passenger);

            // Update trip totals
            trip.PassengerCount++;
            trip.TotalAmount += passenger.Amount;
            trip.NetAmount = trip.TotalAmount - trip.TotalCosts;
            await _tripRepository.UpdateAsync(trip);

            // Update earnings record
            var routeName = $"{trip.DepartureStation} → {trip.DestinationStation}";
            var earnings = _context.VehicleEarnings
                .Where(e => e.VehicleId == trip.VehicleId && 
                           e.Date.Date == trip.DepartureTime.Date &&
                           e.Source == routeName)
                .OrderByDescending(e => e.CreatedAt)
                .FirstOrDefault();

            if (earnings != null)
            {
                earnings.Amount = trip.TotalAmount;
                _context.VehicleEarnings.Update(earnings);
                await _context.SaveChangesAsync();
            }

            return CreatedAtAction(nameof(GetById), new { id = trip.Id }, passenger);
        }

        // POST: api/TaxiRankTrips/{id}/costs
        [HttpPost("{id}/costs")]
        public async Task<ActionResult<TripCost>> AddCost(Guid id, [FromBody] AddTripCostDto dto)
        {
            var trip = await _tripRepository.GetByIdAsync(id);
            if (trip == null)
                return NotFound("Trip not found");

            var cost = new TripCost
            {
                Id = Guid.NewGuid(),
                TaxiRankTripId = id,
                AddedByDriverId = dto.AddedByDriverId,
                Category = dto.Category,
                Amount = dto.Amount,
                Description = dto.Description,
                ReceiptNumber = dto.ReceiptNumber,
                CreatedAt = DateTime.UtcNow
            };

            await _costRepository.AddAsync(cost);

            // Update trip totals
            trip.TotalCosts += cost.Amount;
            trip.NetAmount = trip.TotalAmount - trip.TotalCosts;
            await _tripRepository.UpdateAsync(trip);

            // Create expense record
            var expense = new VehicleExpense
            {
                Id = Guid.NewGuid(),
                VehicleId = trip.VehicleId,
                Date = DateTime.UtcNow,
                Amount = cost.Amount,
                Category = cost.Category,
                Description = $"Trip Cost: {cost.Description}",
                InvoiceNumber = cost.ReceiptNumber,
                Vendor = "Trip Expense",
                CreatedAt = DateTime.UtcNow
            };

            _context.VehicleExpenses.Add(expense);
            await _context.SaveChangesAsync();

            return Ok(cost);
        }

        // PUT: api/TaxiRankTrips/{id}/status
        [HttpPut("{id}/status")]
        public async Task<ActionResult> UpdateStatus(Guid id, [FromBody] UpdateTripStatusDto dto)
        {
            var trip = await _tripRepository.GetByIdAsync(id);
            if (trip == null)
                return NotFound();

            trip.Status = dto.Status;
            
            if (dto.Status == "Arrived" && !trip.ArrivalTime.HasValue)
            {
                trip.ArrivalTime = DateTime.UtcNow;
            }

            await _tripRepository.UpdateAsync(trip);
            return Ok(trip);
        }

        // DELETE: api/TaxiRankTrips/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(Guid id)
        {
            var trip = await _tripRepository.GetByIdAsync(id);
            if (trip == null)
                return NotFound();

            await _tripRepository.DeleteAsync(id);
            return NoContent();
        }

        // DELETE: api/TaxiRankTrips/{tripId}/passengers/{passengerId}
        [HttpDelete("{tripId}/passengers/{passengerId}")]
        public async Task<ActionResult> DeletePassenger(Guid tripId, Guid passengerId)
        {
            var trip = await _tripRepository.GetByIdAsync(tripId);
            if (trip == null)
                return NotFound("Trip not found");

            var passenger = await _passengerRepository.GetByIdAsync(passengerId);
            if (passenger == null)
                return NotFound("Passenger not found");

            // Update trip totals
            trip.PassengerCount--;
            trip.TotalAmount -= passenger.Amount;
            trip.NetAmount = trip.TotalAmount - trip.TotalCosts;
            await _tripRepository.UpdateAsync(trip);

            await _passengerRepository.DeleteAsync(passengerId);

            return NoContent();
        }
    }

    // DTOs
    public class CreateTripDto
    {
        public Guid TenantId { get; set; }
        public Guid VehicleId { get; set; }
        public Guid DriverId { get; set; }
        public Guid MarshalId { get; set; }
        public Guid TaxiRankId { get; set; }
        public string DepartureStation { get; set; } = string.Empty;
        public string DestinationStation { get; set; } = string.Empty;
        public DateTime? DepartureTime { get; set; }
        public string Notes { get; set; }
    }

    public class AddPassengerDto
    {
        public string PassengerName { get; set; }
        public string PassengerPhone { get; set; }
        public string DepartureStation { get; set; } = string.Empty;
        public string ArrivalStation { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public int? SeatNumber { get; set; }
        public string Notes { get; set; }
    }

    public class AddTripCostDto
    {
        public Guid AddedByDriverId { get; set; }
        public string Category { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Description { get; set; } = string.Empty;
        public string ReceiptNumber { get; set; }
    }

    public class UpdateTripStatusDto
    {
        public string Status { get; set; } = string.Empty;
    }
}
