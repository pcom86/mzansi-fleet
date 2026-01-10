using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Application.Handlers;
using System.Threading;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReviewsController : ControllerBase
    {
        private readonly CreateReviewCommandHandler _createReviewHandler;
        public ReviewsController(CreateReviewCommandHandler createReviewHandler)
        {
            _createReviewHandler = createReviewHandler;
        }

        [HttpPost]
        public ActionResult<Review> Create([FromBody] CreateReviewCommand command)
        {
            var result = _createReviewHandler.Handle(command, CancellationToken.None).Result;
            return CreatedAtAction(nameof(Create), new { id = result.Id }, result);
        }
    }
}

