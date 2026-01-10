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
    public class ServiceHistoryController : ControllerBase
    {
        private readonly CreateServiceHistoryCommandHandler _createHandler;
        private readonly UpdateServiceHistoryCommandHandler _updateHandler;
        private readonly DeleteServiceHistoryCommandHandler _deleteHandler;
        private readonly GetAllServiceHistoriesQueryHandler _getAllHandler;
        private readonly GetServiceHistoryByIdQueryHandler _getByIdHandler;
        private readonly GetServiceHistoryByVehicleIdQueryHandler _getByVehicleHandler;
        private readonly GetLatestServiceByVehicleIdQueryHandler _getLatestHandler;

        public ServiceHistoryController(
            CreateServiceHistoryCommandHandler createHandler,
            UpdateServiceHistoryCommandHandler updateHandler,
            DeleteServiceHistoryCommandHandler deleteHandler,
            GetAllServiceHistoriesQueryHandler getAllHandler,
            GetServiceHistoryByIdQueryHandler getByIdHandler,
            GetServiceHistoryByVehicleIdQueryHandler getByVehicleHandler,
            GetLatestServiceByVehicleIdQueryHandler getLatestHandler)
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
        public async Task<ActionResult<IEnumerable<ServiceHistory>>> GetAll()
        {
            var query = new GetAllServiceHistoriesQuery();
            var result = await _getAllHandler.Handle(query, default);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ServiceHistory>> GetById(Guid id)
        {
            var query = new GetServiceHistoryByIdQuery { Id = id };
            var result = await _getByIdHandler.Handle(query, default);
            
            if (result == null)
                return NotFound();
                
            return Ok(result);
        }

        [HttpGet("vehicle/{vehicleId}")]
        public async Task<ActionResult<IEnumerable<ServiceHistory>>> GetByVehicleId(Guid vehicleId)
        {
            var query = new GetServiceHistoryByVehicleIdQuery { VehicleId = vehicleId };
            var result = await _getByVehicleHandler.Handle(query, default);
            return Ok(result);
        }

        [HttpGet("vehicle/{vehicleId}/latest")]
        public async Task<ActionResult<ServiceHistory>> GetLatestByVehicleId(Guid vehicleId)
        {
            var query = new GetLatestServiceByVehicleIdQuery { VehicleId = vehicleId };
            var result = await _getLatestHandler.Handle(query, default);
            
            if (result == null)
                return NotFound();
                
            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<ServiceHistory>> Create([FromBody] CreateServiceHistoryCommand command)
        {
            if (command.Id == Guid.Empty)
                command.Id = Guid.NewGuid();
                
            var result = await _createHandler.Handle(command, default);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ServiceHistory>> Update(Guid id, [FromBody] UpdateServiceHistoryCommand command)
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
            var command = new DeleteServiceHistoryCommand { Id = id };
            await _deleteHandler.Handle(command, default);
            return NoContent();
        }
    }
}
