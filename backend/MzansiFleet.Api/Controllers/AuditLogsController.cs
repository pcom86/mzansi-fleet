using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Application.Handlers;
using System.Threading;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuditLogsController : ControllerBase
    {
        private readonly CreateAuditLogCommandHandler _createAuditLogHandler;
        public AuditLogsController(CreateAuditLogCommandHandler createAuditLogHandler)
        {
            _createAuditLogHandler = createAuditLogHandler;
        }

        [HttpPost]
        public ActionResult<AuditLog> Create([FromBody] CreateAuditLogCommand command)
        {
            var result = _createAuditLogHandler.Handle(command, CancellationToken.None).Result;
            return CreatedAtAction(nameof(Create), new { id = result.Id }, result);
        }
    }
}

