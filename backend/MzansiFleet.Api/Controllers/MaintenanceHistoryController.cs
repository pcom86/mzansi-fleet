using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Application.Commands;
using MzansiFleet.Application.Queries;
using MzansiFleet.Application.Handlers;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MaintenanceHistoryController : ControllerBase
    {
        private readonly CreateMaintenanceHistoryCommandHandler _createHandler;
        private readonly UpdateMaintenanceHistoryCommandHandler _updateHandler;
        private readonly DeleteMaintenanceHistoryCommandHandler _deleteHandler;
        private readonly GetAllMaintenanceHistoriesQueryHandler _getAllHandler;
        private readonly GetMaintenanceHistoryByIdQueryHandler _getByIdHandler;
        private readonly GetMaintenanceHistoryByVehicleIdQueryHandler _getByVehicleHandler;
        private readonly GetLatestMaintenanceByVehicleIdQueryHandler _getLatestHandler;

        public MaintenanceHistoryController(
            CreateMaintenanceHistoryCommandHandler createHandler,
            UpdateMaintenanceHistoryCommandHandler updateHandler,
            DeleteMaintenanceHistoryCommandHandler deleteHandler,
            GetAllMaintenanceHistoriesQueryHandler getAllHandler,
            GetMaintenanceHistoryByIdQueryHandler getByIdHandler,
            GetMaintenanceHistoryByVehicleIdQueryHandler getByVehicleHandler,
            GetLatestMaintenanceByVehicleIdQueryHandler getLatestHandler)
        {
            _createHandler = createHandler;
            _updateHandler = updateHandler;
            _deleteHandler = deleteHandler;
            _getAllHandler = getAllHandler;
            _getByIdHandler = getByIdHandler;
            _getByVehicleHandler = getByVehicleHandler;
            _getLatestHandler = getLatestHandler;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<MaintenanceHistory>>> GetAll()
        {
            var query = new GetAllMaintenanceHistoriesQuery();
            var result = await _getAllHandler.Handle(query, default);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<MaintenanceHistory>> GetById(Guid id)
        {
            var query = new GetMaintenanceHistoryByIdQuery { Id = id };
            var result = await _getByIdHandler.Handle(query, default);
            
            if (result == null)
                return NotFound();
                
            return Ok(result);
        }

        [HttpGet("vehicle/{vehicleId}")]
        public async Task<ActionResult<IEnumerable<MaintenanceHistory>>> GetByVehicleId(Guid vehicleId)
        {
            var query = new GetMaintenanceHistoryByVehicleIdQuery { VehicleId = vehicleId };
            var result = await _getByVehicleHandler.Handle(query, default);
            return Ok(result);
        }

        [HttpGet("vehicle/{vehicleId}/latest")]
        public async Task<ActionResult<MaintenanceHistory>> GetLatestByVehicleId(Guid vehicleId)
        {
            var query = new GetLatestMaintenanceByVehicleIdQuery { VehicleId = vehicleId };
            var result = await _getLatestHandler.Handle(query, default);
            
            if (result == null)
                return NotFound();
                
            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<MaintenanceHistory>> Create([FromBody] CreateMaintenanceHistoryCommand command)
        {
            if (command.Id == Guid.Empty)
                command.Id = Guid.NewGuid();
                
            var result = await _createHandler.Handle(command, default);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<MaintenanceHistory>> Update(Guid id, [FromBody] UpdateMaintenanceHistoryCommand command)
        {
            if (id != command.Id)
                return BadRequest("ID mismatch");
                
            var result = await _updateHandler.Handle(command, default);
            
            if (result == null)
                return NotFound();
                
            return Ok(result);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var command = new DeleteMaintenanceHistoryCommand { Id = id };
            await _deleteHandler.Handle(command, default);
            return NoContent();
        }
    }
}
