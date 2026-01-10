using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Application.Handlers;
using System.Threading;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentIntentsController : ControllerBase
    {
        private readonly CreatePaymentIntentCommandHandler _createPaymentIntentHandler;
        public PaymentIntentsController(CreatePaymentIntentCommandHandler createPaymentIntentHandler)
        {
            _createPaymentIntentHandler = createPaymentIntentHandler;
        }

        [HttpPost]
        public ActionResult<PaymentIntent> Create([FromBody] CreatePaymentIntentCommand command)
        {
            var result = _createPaymentIntentHandler.Handle(command, CancellationToken.None).Result;
            return CreatedAtAction(nameof(Create), new { id = result.Id }, result);
        }
    }
}

