using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Application.Queries;
using MzansiFleet.Application.Handlers;
using System;
using System.Collections.Generic;
using System.Linq;
using MzansiFleet.Repository;
using Microsoft.EntityFrameworkCore;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VehiclesController : ControllerBase
    {
        private readonly GetVehiclesForTenantQueryHandler _getVehiclesHandler;
        private readonly MzansiFleet.Repository.Repositories.VehicleRepository _vehicleRepo;
        private readonly MzansiFleetDbContext _context;
        
        public VehiclesController(GetVehiclesForTenantQueryHandler getVehiclesHandler, MzansiFleet.Repository.Repositories.VehicleRepository vehicleRepo, MzansiFleetDbContext context)
        {
            _getVehiclesHandler = getVehiclesHandler;
            _vehicleRepo = vehicleRepo;
            _context = context;
        }

        [HttpGet("test")]
        public ActionResult TestEndpoint()
        {
            try
            {
                var count = _context.Vehicles.Count();
                return Ok(new { message = "Test successful", vehicleCount = count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, innerException = ex.InnerException?.Message });
            }
        }

        [HttpGet]
        public ActionResult GetAll([FromQuery] Guid? rankId = null)
        {
            try
            {
                IQueryable<Vehicle> query = _context.Vehicles;

                if (rankId.HasValue)
                {
                    // Filter vehicles linked to the specified rank via VehicleTaxiRank
                    query = query
                        .Join(_context.VehicleTaxiRanks.Where(vtr => vtr.TaxiRankId == rankId.Value && vtr.IsActive),
                              v => v.Id,
                              vtr => vtr.VehicleId,
                              (v, vtr) => v);
                }

                // Query vehicles and explicitly handle Photos field
                var vehicles = query
                    .Select(v => new 
                    {
                        v.Id,
                        v.TenantId,
                        v.Registration,
                        v.Make,
                        v.Model,
                        v.Year,
                        v.VIN,
                        v.EngineNumber,
                        v.Odometer,
                        v.Mileage,
                        v.LastServiceDate,
                        v.NextServiceDate,
                        v.LastMaintenanceDate,
                        v.NextMaintenanceDate,
                        v.ServiceIntervalKm,
                        v.Capacity,
                        v.Type,
                        v.BaseLocation,
                        v.Status,
                        v.PhotoBase64,
                        Photos = v.Photos ?? new List<string>()
                    })
                    .ToList();
                
                return Ok(vehicles);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new 
                { 
                    error = ex.Message, 
                    innerException = ex.InnerException?.Message,
                    stackTrace = ex.StackTrace?.Substring(0, Math.Min(500, ex.StackTrace?.Length ?? 0))
                });
            }
        }

        [HttpGet("{id}")]
        public ActionResult<Vehicle> GetById(Guid id)
        {
            var vehicle = _vehicleRepo.GetById(id);
            if (vehicle == null)
            {
                return NotFound(new { error = "Vehicle not found" });
            }
            return Ok(vehicle);
        }

        [HttpGet("tenant/{tenantId}")]
        public ActionResult<IEnumerable<Vehicle>> GetByTenantId(Guid tenantId)
        {
            var query = new GetVehiclesForTenantQuery { TenantId = tenantId };
            var vehicles = _getVehiclesHandler.Handle(query);
            return Ok(vehicles);
        }
        [HttpPost]
        public IActionResult Add([FromBody] Vehicle vehicle)
        {
            try
            {
                // Generate a new GUID if not provided
                if (vehicle.Id == Guid.Empty)
                {
                    vehicle.Id = Guid.NewGuid();
                }
                
                // Ensure TenantId is set
                if (vehicle.TenantId == Guid.Empty)
                {
                    return BadRequest(new { error = "TenantId is required" });
                }
                
                _vehicleRepo.Add(vehicle);
                return CreatedAtAction(nameof(GetByTenantId), new { tenantId = vehicle.TenantId }, vehicle);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    error = ex.Message, 
                    innerException = ex.InnerException?.Message,
                    stackTrace = ex.StackTrace?.Substring(0, Math.Min(500, ex.StackTrace?.Length ?? 0))
                });
            }
        }

        [HttpPut("{id}")]
        public IActionResult Update(Guid id, [FromBody] Vehicle vehicle)
        {
            try
            {
                if (id != vehicle.Id)
                {
                    return BadRequest(new { error = "ID mismatch" });
                }

                // Check if vehicle exists without tracking
                var exists = _vehicleRepo.GetById(id) != null;
                if (!exists)
                {
                    return NotFound(new { error = "Vehicle not found" });
                }

                // Update the vehicle - the repository will handle detaching
                _vehicleRepo.Update(vehicle);
                return Ok(vehicle);
            }
            catch (Exception ex)
            {
                var innerEx = ex.InnerException;
                var innerMsg = innerEx?.Message;
                var innerInnerMsg = innerEx?.InnerException?.Message;
                
                return StatusCode(500, new { 
                    error = ex.Message, 
                    innerException = innerMsg,
                    innerInnerException = innerInnerMsg,
                    stackTrace = ex.StackTrace?.Substring(0, Math.Min(500, ex.StackTrace?.Length ?? 0))
                });
            }
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(Guid id)
        {
            var existing = _vehicleRepo.GetById(id);
            if (existing == null)
            {
                return NotFound(new { error = "Vehicle not found" });
            }

            _vehicleRepo.Delete(id);
            return NoContent();
        }
    }
}
