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
    public class VehicleExpensesController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public VehicleExpensesController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        [HttpGet("vehicle/{vehicleId}")]
        public async Task<ActionResult<IEnumerable<VehicleExpense>>> GetByVehicleId(Guid vehicleId)
        {
            var expenses = await _context.VehicleExpenses
                .Where(e => e.VehicleId == vehicleId)
                .OrderByDescending(e => e.Date)
                .ToListAsync();
            return Ok(expenses);
        }

        [HttpGet("vehicle/{vehicleId}/period")]
        public async Task<ActionResult<IEnumerable<VehicleExpense>>> GetByVehicleIdAndPeriod(
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

            var expenses = await _context.VehicleExpenses
                .Where(e => e.VehicleId == vehicleId && e.Date >= startDate && e.Date <= endDate)
                .OrderByDescending(e => e.Date)
                .ToListAsync();
            return Ok(expenses);
        }

        [HttpPost]
        public async Task<ActionResult<VehicleExpense>> Create([FromBody] VehicleExpense expense)
        {
            if (expense.Id == Guid.Empty)
            {
                expense.Id = Guid.NewGuid();
            }
            expense.CreatedAt = DateTime.UtcNow;
            // Ensure Date is UTC
            if (expense.Date.Kind == DateTimeKind.Unspecified)
            {
                expense.Date = DateTime.SpecifyKind(expense.Date, DateTimeKind.Utc);
            }
            // Set default for required field if empty
            if (string.IsNullOrWhiteSpace(expense.Category))
                expense.Category = string.Empty;

            _context.VehicleExpenses.Add(expense);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetByVehicleId), new { vehicleId = expense.VehicleId }, expense);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] VehicleExpense expense)
        {
            if (id != expense.Id)
            {
                return BadRequest(new { error = "ID mismatch" });
            }

            _context.Entry(expense).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _context.VehicleExpenses.AnyAsync(e => e.Id == id))
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
            var expense = await _context.VehicleExpenses.FindAsync(id);
            if (expense == null)
            {
                return NotFound();
            }

            _context.VehicleExpenses.Remove(expense);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
