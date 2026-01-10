using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Application.Queries;
using MzansiFleet.Application.Handlers;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VehicleAlertsController : ControllerBase
    {
        private readonly GetVehiclesNeedingServiceQueryHandler _getAlertsHandler;

        public VehicleAlertsController(GetVehiclesNeedingServiceQueryHandler getAlertsHandler)
        {
            _getAlertsHandler = getAlertsHandler;
        }

        [HttpGet("service-due")]
        public async Task<ActionResult<IEnumerable<VehicleServiceAlert>>> GetServiceAlerts([FromQuery] int daysThreshold = 7, [FromQuery] int mileageThreshold = 500)
        {
            var query = new GetVehiclesNeedingServiceQuery 
            { 
                DaysThreshold = daysThreshold,
                MileageThreshold = mileageThreshold
            };
            
            var result = await _getAlertsHandler.Handle(query, default);
            return Ok(result);
        }
    }
}
