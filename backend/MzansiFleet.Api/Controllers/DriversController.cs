using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Application.Commands;
using MzansiFleet.Application.Queries;
using MzansiFleet.Application.Handlers;
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
    public class DriversController : ControllerBase
    {
        private readonly CreateDriverCommandHandler _createHandler;
        private readonly UpdateDriverCommandHandler _updateHandler;
        private readonly DeleteDriverCommandHandler _deleteHandler;
        private readonly GetDriversQueryHandler _getAllHandler;
        private readonly GetDriverByIdQueryHandler _getByIdHandler;
        private readonly MzansiFleetDbContext _context;
        public DriversController(
            CreateDriverCommandHandler createHandler,
            UpdateDriverCommandHandler updateHandler,
            DeleteDriverCommandHandler deleteHandler,
            GetDriversQueryHandler getAllHandler,
            GetDriverByIdQueryHandler getByIdHandler,
            MzansiFleetDbContext context)
        {
            _createHandler = createHandler;
            _updateHandler = updateHandler;
            _deleteHandler = deleteHandler;
            _getAllHandler = getAllHandler;
            _getByIdHandler = getByIdHandler;
            _context = context;
        }
        [HttpGet]
        public ActionResult<IEnumerable<DriverProfile>> GetAll([FromQuery] Guid? tenantId)
        {
            var drivers = _getAllHandler.Handle(new GetDriversQuery());
            if (tenantId.HasValue && tenantId.Value != Guid.Empty)
            {
                drivers = drivers.Where(d => d.User != null && d.User.TenantId == tenantId.Value);
            }
            return Ok(drivers);
        }
        [HttpGet("{id}")]
        public ActionResult<DriverProfile> GetById(Guid id)
        {
            var driver = _getByIdHandler.Handle(new GetDriverByIdQuery { Id = id });
            if (driver == null) return NotFound();
            return Ok(driver);
        }

        [HttpGet("vehicle/{vehicleId}")]
        public ActionResult<DriverProfile> GetByVehicleId(Guid vehicleId)
        {
            var driver = _getAllHandler.Handle(new GetDriversQuery())
                .FirstOrDefault(d => d.AssignedVehicleId == vehicleId);
            
            if (driver == null)
                return NotFound(new { message = "No driver assigned to this vehicle" });
            
            return Ok(driver);
        }

        [HttpGet("revenue")]
        public async Task<ActionResult<IEnumerable<DriverRevenueDto>>> GetRevenue(
            [FromQuery] Guid? tenantId,
            [FromQuery] string? driverIds,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to)
        {
            var parsedDriverIds = (driverIds ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(x => Guid.TryParse(x.Trim(), out var id) ? id : Guid.Empty)
                .Where(x => x != Guid.Empty)
                .Distinct()
                .ToList();

            if ((!tenantId.HasValue || tenantId.Value == Guid.Empty) && parsedDriverIds.Count == 0)
            {
                return BadRequest(new { message = "tenantId or driverIds is required" });
            }

            var start = (from ?? DateTime.UtcNow.AddDays(-30)).Date;
            var end = (to ?? DateTime.UtcNow).Date.AddDays(1).AddTicks(-1);

            var driverQuery = _context.DriverProfiles
                .Include(d => d.User)
                .AsQueryable();

            if (parsedDriverIds.Count > 0)
            {
                driverQuery = driverQuery.Where(d => parsedDriverIds.Contains(d.Id));
            }
            else if (tenantId.HasValue && tenantId.Value != Guid.Empty)
            {
                driverQuery = driverQuery.Where(d => d.User != null && d.User.TenantId == tenantId.Value);
            }

            var drivers = await driverQuery
                .Select(d => new
                {
                    d.Id,
                    Name = d.Name ?? (d.User != null ? d.User.FullName : null) ?? "Unknown Driver"
                })
                .ToListAsync();

            var tripQuery = _context.TaxiRankTrips
                .Where(t => t.DriverId != null
                    && t.DepartureTime >= start
                    && t.DepartureTime <= end);

            if (parsedDriverIds.Count > 0)
            {
                tripQuery = tripQuery.Where(t => t.DriverId != null && parsedDriverIds.Contains(t.DriverId.Value));
            }
            else if (tenantId.HasValue && tenantId.Value != Guid.Empty)
            {
                tripQuery = tripQuery.Where(t => t.TenantId == tenantId.Value);
            }

            var tripRows = await tripQuery
                .Select(t => new
                {
                    DriverId = t.DriverId!.Value,
                    t.VehicleId,
                    t.DepartureTime,
                    Revenue = t.TotalAmount,
                })
                .ToListAsync();

            var tripRevenueByDriver = tripRows
                .GroupBy(t => t.DriverId)
                .ToDictionary(
                    g => g.Key,
                    g => new
                    {
                        Revenue = g.Sum(x => x.Revenue),
                        Trips = g.Count(),
                        LastTripAt = (DateTime?)g.Max(x => x.DepartureTime)
                    });

            // Include dispatch-time earnings captured in VehicleEarnings when the driver was driving,
            // but avoid double counting records that already have a TaxiRankTrip for the same driver/vehicle/day.
            var dispatchEarningRowsQuery =
                from q in _context.DailyTaxiQueues
                join ve in _context.VehicleEarnings on q.VehicleId equals ve.VehicleId
                where q.DriverId != null
                      && q.Status == "Dispatched"
                      && ve.Source == "Trip"
                      && q.QueueDate >= start.Date
                      && q.QueueDate <= end.Date
                      && ve.Date >= start
                      && ve.Date <= end
                      && ve.Date.Date == q.QueueDate
                select new
                {
                    DriverId = q.DriverId!.Value,
                    q.VehicleId,
                    QueueDate = q.QueueDate,
                    Amount = ve.Amount,
                    ve.Date,
                    q.TenantId,
                };

            if (parsedDriverIds.Count > 0)
            {
                dispatchEarningRowsQuery = dispatchEarningRowsQuery.Where(x => parsedDriverIds.Contains(x.DriverId));
            }
            else if (tenantId.HasValue && tenantId.Value != Guid.Empty)
            {
                dispatchEarningRowsQuery = dispatchEarningRowsQuery.Where(x => x.TenantId == tenantId.Value);
            }

            var dispatchRows = await dispatchEarningRowsQuery.ToListAsync();

            var tripKeySet = new HashSet<string>(tripRows.Select(t => $"{t.DriverId}:{t.VehicleId}:{t.DepartureTime.Date:yyyyMMdd}"));

            var unmatchedDispatchRows = dispatchRows
                .Where(d => !tripKeySet.Contains($"{d.DriverId}:{d.VehicleId}:{d.QueueDate:yyyyMMdd}"))
                .ToList();

            var dispatchRevenueByDriver = unmatchedDispatchRows
                .GroupBy(d => d.DriverId)
                .ToDictionary(
                    g => g.Key,
                    g => new
                    {
                        Revenue = g.Sum(x => x.Amount),
                        Trips = g.Count(),
                        LastTripAt = (DateTime?)g.Max(x => x.Date)
                    });

            var result = drivers.Select(d =>
            {
                var hasTrips = tripRevenueByDriver.TryGetValue(d.Id, out var tripRev);
                var hasDispatch = dispatchRevenueByDriver.TryGetValue(d.Id, out var dispatchRev);

                var totalRevenue = (hasTrips ? tripRev!.Revenue : 0) + (hasDispatch ? dispatchRev!.Revenue : 0);
                var totalTrips = (hasTrips ? tripRev!.Trips : 0) + (hasDispatch ? dispatchRev!.Trips : 0);
                var lastTripAt = new[]
                {
                    hasTrips ? tripRev!.LastTripAt : null,
                    hasDispatch ? dispatchRev!.LastTripAt : null,
                }.Where(x => x.HasValue).Select(x => x!.Value).DefaultIfEmpty().Max();

                return new DriverRevenueDto
                {
                    DriverId = d.Id,
                    DriverName = d.Name,
                    Revenue = totalRevenue,
                    TripCount = totalTrips,
                    LastTripAt = lastTripAt == default ? null : lastTripAt,
                };
            })
            .OrderByDescending(x => x.Revenue)
            .ThenBy(x => x.DriverName)
            .ToList();

            return Ok(result);
        }
        [HttpPost]
        public IActionResult Add([FromBody] DriverProfile driver)
        {
            var command = new CreateDriverCommand {
                UserId = driver.UserId,
                Name = driver.Name,
                Phone = driver.Phone,
                Email = driver.Email,
                PhotoUrl = driver.PhotoUrl,
                IsActive = driver.IsActive,
                IsAvailable = driver.IsAvailable,
                AssignedVehicleId = driver.AssignedVehicleId
            };
            var created = _createHandler.Handle(command);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        [HttpPut("{id}")]
        public IActionResult Update(Guid id, [FromBody] DriverProfile driver)
        {
            if (id != driver.Id) return BadRequest();
            var command = new UpdateDriverCommand {
                Id = driver.Id,
                UserId = driver.UserId,
                Name = driver.Name,
                Phone = driver.Phone,
                Email = driver.Email,
                PhotoUrl = driver.PhotoUrl,
                IsActive = driver.IsActive,
                IsAvailable = driver.IsAvailable,
                AssignedVehicleId = driver.AssignedVehicleId
            };
            _updateHandler.Handle(command);
            return NoContent();
        }
        [HttpDelete("{id}")]
        public IActionResult Delete(Guid id)
        {
            _deleteHandler.Handle(new DeleteDriverCommand { Id = id });
            return NoContent();
        }

        public class DriverRevenueDto
        {
            public Guid DriverId { get; set; }
            public string DriverName { get; set; } = string.Empty;
            public decimal Revenue { get; set; }
            public int TripCount { get; set; }
            public DateTime? LastTripAt { get; set; }
        }
    }
}

