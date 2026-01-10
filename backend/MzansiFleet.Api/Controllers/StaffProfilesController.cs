using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Application.Handlers;
using System.Threading;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StaffProfilesController : ControllerBase
    {
        private readonly CreateStaffProfileCommandHandler _createStaffProfileHandler;
        public StaffProfilesController(CreateStaffProfileCommandHandler createStaffProfileHandler)
        {
            _createStaffProfileHandler = createStaffProfileHandler;
        }

        [HttpPost]
        public ActionResult<StaffProfile> Create([FromBody] CreateStaffProfileCommand command)
        {
            var result = _createStaffProfileHandler.Handle(command, CancellationToken.None).Result;
            return CreatedAtAction(nameof(Create), new { id = result.Id }, result);
        }
    }
}

