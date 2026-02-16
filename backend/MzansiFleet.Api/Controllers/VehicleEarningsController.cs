using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Repository;
using MzansiFleet.Application.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VehicleEarningsController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;
        private readonly VehicleNotificationService _notificationService;

        public VehicleEarningsController(MzansiFleetDbContext context, VehicleNotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        [HttpGet("vehicle/{vehicleId}")]
        public async Task<ActionResult<IEnumerable<VehicleEarnings>>> GetByVehicleId(Guid vehicleId)
        {
            var earnings = await _context.VehicleEarnings
                .Where(e => e.VehicleId == vehicleId)
                .OrderByDescending(e => e.Date)
                .ToListAsync();
            return Ok(earnings);
        }

        [HttpGet("vehicle/{vehicleId}/period")]
        public async Task<ActionResult<IEnumerable<VehicleEarnings>>> GetByVehicleIdAndPeriod(
            Guid vehicleId, 
            [FromQuery] DateTime startDate, 
            [FromQuery] DateTime endDate)
        {
            // Ensure dates are UTC and set to start/end of day
            if (startDate.Kind == DateTimeKind.Unspecified)
                startDate = DateTime.SpecifyKind(startDate, DateTimeKind.Utc);
            if (endDate.Kind == DateTimeKind.Unspecified)
                endDate = DateTime.SpecifyKind(endDate, DateTimeKind.Utc);

            // Set startDate to beginning of day and endDate to end of day
            startDate = startDate.Date;
            endDate = endDate.Date.AddDays(1).AddTicks(-1); // End of day: 23:59:59.9999999

            var earnings = await _context.VehicleEarnings
                .Where(e => e.VehicleId == vehicleId && e.Date >= startDate && e.Date <= endDate)
                .OrderByDescending(e => e.Date)
                .ToListAsync();
            return Ok(earnings);
        }

        [HttpPost]
        public async Task<ActionResult<VehicleEarnings>> Create([FromBody] VehicleEarnings earnings)
        {
            if (earnings.Id == Guid.Empty)
            {
                earnings.Id = Guid.NewGuid();
            }
            earnings.CreatedAt = DateTime.UtcNow;
            // Ensure Date is UTC
            if (earnings.Date.Kind == DateTimeKind.Unspecified)
            {
                earnings.Date = DateTime.SpecifyKind(earnings.Date, DateTimeKind.Utc);
            }
            // Set defaults for required fields if empty
            if (string.IsNullOrWhiteSpace(earnings.Source))
                earnings.Source = string.Empty;
            if (string.IsNullOrWhiteSpace(earnings.Period))
                earnings.Period = "Daily";

            _context.VehicleEarnings.Add(earnings);
            await _context.SaveChangesAsync();
            
            // Send notification to owner
            await _notificationService.NotifyEarningRecorded(
                earnings.VehicleId,
                earnings.Source,
                earnings.Amount,
                earnings.Date,
                earnings.Description ?? "No description provided");

            return CreatedAtAction(nameof(GetByVehicleId), new { vehicleId = earnings.VehicleId }, earnings);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] VehicleEarnings earnings)
        {
            if (id != earnings.Id)
            {
                return BadRequest(new { error = "ID mismatch" });
            }

            _context.Entry(earnings).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _context.VehicleEarnings.AnyAsync(e => e.Id == id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var earnings = await _context.VehicleEarnings.FindAsync(id);
            if (earnings == null)
            {
                return NotFound();
            }

            _context.VehicleEarnings.Remove(earnings);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
