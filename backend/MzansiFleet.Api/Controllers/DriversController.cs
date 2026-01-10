using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Application.Commands;
using MzansiFleet.Application.Queries;
using MzansiFleet.Application.Handlers;
using System;
using System.Collections.Generic;

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
        public DriversController(
            CreateDriverCommandHandler createHandler,
            UpdateDriverCommandHandler updateHandler,
            DeleteDriverCommandHandler deleteHandler,
            GetDriversQueryHandler getAllHandler,
            GetDriverByIdQueryHandler getByIdHandler)
        {
            _createHandler = createHandler;
            _updateHandler = updateHandler;
            _deleteHandler = deleteHandler;
            _getAllHandler = getAllHandler;
            _getByIdHandler = getByIdHandler;
        }
        [HttpGet]
        public ActionResult<IEnumerable<DriverProfile>> GetAll()
        {
            return Ok(_getAllHandler.Handle(new GetDriversQuery()));
        }
        [HttpGet("{id}")]
        public ActionResult<DriverProfile> GetById(Guid id)
        {
            var driver = _getByIdHandler.Handle(new GetDriverByIdQuery { Id = id });
            if (driver == null) return NotFound();
            return Ok(driver);
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
    }
}
