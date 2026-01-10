using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Application.Handlers;
using System.Threading;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TripRequestsController : ControllerBase
    {
        private readonly CreateTripRequestCommandHandler _createTripRequestHandler;
        public TripRequestsController(CreateTripRequestCommandHandler createTripRequestHandler)
        {
            _createTripRequestHandler = createTripRequestHandler;
        }

        [HttpPost]
        public ActionResult<TripRequest> Create([FromBody] CreateTripRequestCommand command)
        {
            var result = _createTripRequestHandler.Handle(command, CancellationToken.None).Result;
            return CreatedAtAction(nameof(Create), new { id = result.Id }, result);
        }
    }
}

