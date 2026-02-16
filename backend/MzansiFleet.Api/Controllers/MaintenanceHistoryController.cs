using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Application.Commands;
using MzansiFleet.Application.Queries;
using MzansiFleet.Application.Handlers;
using MzansiFleet.Application.Services;
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
        private readonly VehicleNotificationService _notificationService;

        public MaintenanceHistoryController(
            CreateMaintenanceHistoryCommandHandler createHandler,
            UpdateMaintenanceHistoryCommandHandler updateHandler,
            DeleteMaintenanceHistoryCommandHandler deleteHandler,
            GetAllMaintenanceHistoriesQueryHandler getAllHandler,
            GetMaintenanceHistoryByIdQueryHandler getByIdHandler,
            GetMaintenanceHistoryByVehicleIdQueryHandler getByVehicleHandler,
            GetLatestMaintenanceByVehicleIdQueryHandler getLatestHandler,
            VehicleNotificationService notificationService)
        {
            _createHandler = createHandler;
            _updateHandler = updateHandler;
            _deleteHandler = deleteHandler;
            _getAllHandler = getAllHandler;
            _getByIdHandler = getByIdHandler;
            _getByVehicleHandler = getByVehicleHandler;
            _getLatestHandler = getLatestHandler;
            _notificationService = notificationService;
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
            
            // Send notifications based on status
            if (result.Status == "Pending" || result.Status == "Requested")
            {
                await _notificationService.NotifyMaintenanceRequested(
                    result.VehicleId, 
                    result.MaintenanceType, 
                    result.Description);
            }
            else if (result.Status == "Scheduled" && result.ScheduledDate.HasValue)
            {
                await _notificationService.NotifyMaintenanceScheduled(
                    result.VehicleId, 
                    result.MaintenanceType, 
                    result.ScheduledDate.Value);
            }
            else if (result.Status == "Completed" && result.CompletedDate.HasValue)
            {
                await _notificationService.NotifyMaintenanceCompleted(
                    result.VehicleId, 
                    result.MaintenanceType, 
                    result.Cost, 
                    result.CompletedDate.Value);
            }
            
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<MaintenanceHistory>> Update(Guid id, [FromBody] UpdateMaintenanceHistoryCommand command)
        {
            if (id != command.Id)
                return BadRequest("ID mismatch");
            
            // Get old record to detect status changes
            var oldRecord = await _getByIdHandler.Handle(new GetMaintenanceHistoryByIdQuery { Id = id }, default);
                
            var result = await _updateHandler.Handle(command, default);
            
            if (result == null)
                return NotFound();
            
            // Send notifications on status changes
            if (oldRecord != null && oldRecord.Status != result.Status)
            {
                if (result.Status == "Scheduled" && result.ScheduledDate.HasValue)
                {
                    await _notificationService.NotifyMaintenanceScheduled(
                        result.VehicleId, 
                        result.MaintenanceType, 
                        result.ScheduledDate.Value);
                }
                else if (result.Status == "Completed" && result.CompletedDate.HasValue)
                {
                    await _notificationService.NotifyMaintenanceCompleted(
                        result.VehicleId, 
                        result.MaintenanceType, 
                        result.Cost, 
                        result.CompletedDate.Value);
                }
            }
                
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
