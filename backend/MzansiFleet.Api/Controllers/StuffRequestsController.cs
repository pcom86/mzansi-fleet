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
    public class StuffRequestsController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public StuffRequestsController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        // GET: api/StuffRequests
        [HttpGet]
        public async Task<ActionResult<IEnumerable<StuffRequest>>> GetAllStuffRequests()
        {
            var requests = await _context.StuffRequests
                .Include(r => r.Quotes)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Ok(requests);
        }

        // GET: api/StuffRequests/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<StuffRequest>> GetStuffRequest(Guid id)
        {
            var request = await _context.StuffRequests
                .Include(r => r.Quotes)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null)
            {
                return NotFound();
            }

            return Ok(request);
        }

        // GET: api/StuffRequests/passenger/{passengerId}
        [HttpGet("passenger/{passengerId}")]
        public async Task<ActionResult<IEnumerable<StuffRequest>>> GetRequestsByPassenger(Guid passengerId)
        {
            var requests = await _context.StuffRequests
                .Include(r => r.Quotes)
                .Where(r => r.PassengerId == passengerId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Ok(requests);
        }

        // GET: api/StuffRequests/available - Get pending requests that don't have approved quotes
        [HttpGet("available")]
        public async Task<ActionResult<IEnumerable<StuffRequest>>> GetAvailableRequests()
        {
            var requests = await _context.StuffRequests
                .Include(r => r.Quotes)
                .Where(r => r.Status == "Pending" || r.Status == "QuotesReceived")
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Ok(requests);
        }

        // POST: api/StuffRequests
        [HttpPost]
        public async Task<ActionResult<StuffRequest>> CreateStuffRequest([FromBody] StuffRequest request)
        {
            try
            {
                request.Id = Guid.NewGuid();
                request.Status = "Pending";
                request.CreatedAt = DateTime.UtcNow;

                _context.StuffRequests.Add(request);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetStuffRequest), new { id = request.Id }, request);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to create stuff request", details = ex.Message });
            }
        }

        // PUT: api/StuffRequests/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateStuffRequest(Guid id, [FromBody] StuffRequest request)
        {
            if (id != request.Id)
            {
                return BadRequest(new { error = "ID mismatch" });
            }

            try
            {
                var existingRequest = await _context.StuffRequests.FindAsync(id);
                if (existingRequest == null)
                {
                    return NotFound();
                }

                // Update fields
                existingRequest.ItemDescription = request.ItemDescription;
                existingRequest.ItemCategory = request.ItemCategory;
                existingRequest.EstimatedWeight = request.EstimatedWeight;
                existingRequest.Size = request.Size;
                existingRequest.PickupLocation = request.PickupLocation;
                existingRequest.DeliveryLocation = request.DeliveryLocation;
                existingRequest.EstimatedDistance = request.EstimatedDistance;
                existingRequest.RequestedPickupDate = request.RequestedPickupDate;
                existingRequest.RequestedDeliveryDate = request.RequestedDeliveryDate;
                existingRequest.Priority = request.Priority;
                existingRequest.SpecialInstructions = request.SpecialInstructions;
                existingRequest.Status = request.Status;
                existingRequest.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to update stuff request", details = ex.Message });
            }
        }

        // PUT: api/StuffRequests/{id}/approve-quote/{quoteId}
        [HttpPut("{id}/approve-quote/{quoteId}")]
        public async Task<IActionResult> ApproveQuote(Guid id, Guid quoteId)
        {
            try
            {
                var request = await _context.StuffRequests
                    .Include(r => r.Quotes)
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (request == null)
                {
                    return NotFound(new { error = "Stuff request not found" });
                }

                var quote = request.Quotes.FirstOrDefault(q => q.Id == quoteId);
                if (quote == null)
                {
                    return NotFound(new { error = "Quote not found" });
                }

                // Update request
                request.ApprovedQuoteId = quoteId;
                request.Status = "Approved";
                request.UpdatedAt = DateTime.UtcNow;

                // Update the approved quote status
                quote.Status = "Approved";
                quote.UpdatedAt = DateTime.UtcNow;

                // Reject all other quotes
                foreach (var otherQuote in request.Quotes.Where(q => q.Id != quoteId))
                {
                    otherQuote.Status = "Rejected";
                    otherQuote.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Quote approved successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to approve quote", details = ex.Message });
            }
        }

        // PUT: api/StuffRequests/{id}/cancel
        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> CancelRequest(Guid id)
        {
            try
            {
                var request = await _context.StuffRequests.FindAsync(id);
                if (request == null)
                {
                    return NotFound();
                }

                request.Status = "Cancelled";
                request.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new { message = "Request cancelled successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to cancel request", details = ex.Message });
            }
        }

        // DELETE: api/StuffRequests/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteStuffRequest(Guid id)
        {
            try
            {
                var request = await _context.StuffRequests
                    .Include(r => r.Quotes)
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (request == null)
                {
                    return NotFound();
                }

                // Delete all associated quotes first
                _context.StuffQuotes.RemoveRange(request.Quotes);
                _context.StuffRequests.Remove(request);

                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to delete stuff request", details = ex.Message });
            }
        }
    }
}
