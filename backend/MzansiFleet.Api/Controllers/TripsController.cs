using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Domain.Entities;
using System;
using System.Collections.Generic;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TripsController : ControllerBase
    {
        // Note: This controller is for legacy TripRequest system
        // For taxi rank trips, use TripDetailsController instead
        public TripsController()
        {
        }
        
        [HttpGet]
        public ActionResult<IEnumerable<TripRequest>> GetAll()
        {
            // Return empty list - this is legacy functionality
            // Use /api/TripDetails for actual trip data
            return Ok(new List<TripRequest>());
        }
        
        [HttpGet("{id}")]
        public ActionResult<TripRequest> GetById(Guid id)
        {
            return NotFound();
        }
        
        [HttpPost]
        public IActionResult Add([FromBody] TripRequest trip)
        {
            return BadRequest("This endpoint is deprecated. Use /api/TripDetails instead.");
        }
        
        [HttpPut("{id}")]
        public IActionResult Update(Guid id, [FromBody] TripRequest trip)
        {
            return BadRequest("This endpoint is deprecated. Use /api/TripDetails instead.");
        }
        
        [HttpDelete("{id}")]
        public IActionResult Delete(Guid id)
        {
            return BadRequest("This endpoint is deprecated. Use /api/TripDetails instead.");
        }
    }
}
