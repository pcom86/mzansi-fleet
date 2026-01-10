using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StuffQuotesController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public StuffQuotesController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        // GET: api/StuffQuotes
        [HttpGet]
        public async Task<ActionResult<IEnumerable<StuffQuote>>> GetAllQuotes()
        {
            var quotes = await _context.StuffQuotes
                .Include(q => q.StuffRequest)
                .OrderByDescending(q => q.CreatedAt)
                .ToListAsync();

            return Ok(quotes);
        }

        // GET: api/StuffQuotes/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<StuffQuote>> GetQuote(Guid id)
        {
            var quote = await _context.StuffQuotes
                .Include(q => q.StuffRequest)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quote == null)
            {
                return NotFound();
            }

            return Ok(quote);
        }

        // GET: api/StuffQuotes/request/{requestId}
        [HttpGet("request/{requestId}")]
        public async Task<ActionResult<IEnumerable<StuffQuote>>> GetQuotesByRequest(Guid requestId)
        {
            var quotes = await _context.StuffQuotes
                .Where(q => q.StuffRequestId == requestId)
                .OrderBy(q => q.QuotedPrice)
                .ToListAsync();

            return Ok(quotes);
        }

        // GET: api/StuffQuotes/owner/{ownerId}
        [HttpGet("owner/{ownerId}")]
        public async Task<ActionResult<IEnumerable<StuffQuote>>> GetQuotesByOwner(Guid ownerId)
        {
            var quotes = await _context.StuffQuotes
                .Include(q => q.StuffRequest)
                .Where(q => q.OwnerId == ownerId)
                .OrderByDescending(q => q.CreatedAt)
                .ToListAsync();

            return Ok(quotes);
        }

        // POST: api/StuffQuotes
        [HttpPost]
        public async Task<ActionResult<StuffQuote>> CreateQuote([FromBody] StuffQuote quote)
        {
            try
            {
                // Check if request exists and is still available
                var request = await _context.StuffRequests.FindAsync(quote.StuffRequestId);
                if (request == null)
                {
                    return NotFound(new { error = "Stuff request not found" });
                }

                if (request.Status == "Approved" || request.Status == "Cancelled")
                {
                    return BadRequest(new { error = "This request is no longer available for quotes" });
                }

                // Check if owner already submitted a quote for this request
                var existingQuote = await _context.StuffQuotes
                    .FirstOrDefaultAsync(q => q.StuffRequestId == quote.StuffRequestId && q.OwnerId == quote.OwnerId);

                if (existingQuote != null)
                {
                    return BadRequest(new { error = "You have already submitted a quote for this request" });
                }

                quote.Id = Guid.NewGuid();
                quote.Status = "Pending";
                quote.CreatedAt = DateTime.UtcNow;

                _context.StuffQuotes.Add(quote);

                // Update request status if it's the first quote
                if (request.Status == "Pending")
                {
                    request.Status = "QuotesReceived";
                    request.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetQuote), new { id = quote.Id }, quote);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to create quote", details = ex.Message });
            }
        }

        // PUT: api/StuffQuotes/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateQuote(Guid id, [FromBody] StuffQuote quote)
        {
            if (id != quote.Id)
            {
                return BadRequest(new { error = "ID mismatch" });
            }

            try
            {
                var existingQuote = await _context.StuffQuotes.FindAsync(id);
                if (existingQuote == null)
                {
                    return NotFound();
                }

                // Only allow updates if quote is still pending
                if (existingQuote.Status != "Pending")
                {
                    return BadRequest(new { error = "Cannot update a quote that has been approved or rejected" });
                }

                existingQuote.QuotedPrice = quote.QuotedPrice;
                existingQuote.Notes = quote.Notes;
                existingQuote.EstimatedPickupTime = quote.EstimatedPickupTime;
                existingQuote.EstimatedDeliveryTime = quote.EstimatedDeliveryTime;
                existingQuote.VehicleId = quote.VehicleId;
                existingQuote.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to update quote", details = ex.Message });
            }
        }

        // DELETE: api/StuffQuotes/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteQuote(Guid id)
        {
            try
            {
                var quote = await _context.StuffQuotes.FindAsync(id);
                if (quote == null)
                {
                    return NotFound();
                }

                // Only allow deletion if quote is still pending
                if (quote.Status != "Pending")
                {
                    return BadRequest(new { error = "Cannot delete a quote that has been approved or rejected" });
                }

                _context.StuffQuotes.Remove(quote);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to delete quote", details = ex.Message });
            }
        }
    }
}
