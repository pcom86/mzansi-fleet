using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Repository;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VehicleProfitabilityController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public VehicleProfitabilityController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        [HttpGet("vehicle/{vehicleId}")]
        public async Task<ActionResult> GetProfitabilityReport(
            Guid vehicleId,
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate)
        {
            // Ensure dates are UTC
            if (startDate.Kind == DateTimeKind.Unspecified)
                startDate = DateTime.SpecifyKind(startDate, DateTimeKind.Utc);
            if (endDate.Kind == DateTimeKind.Unspecified)
                endDate = DateTime.SpecifyKind(endDate, DateTimeKind.Utc);

            var vehicle = await _context.Vehicles.FindAsync(vehicleId);
            if (vehicle == null)
            {
                return NotFound(new { error = "Vehicle not found" });
            }

            var earnings = await _context.VehicleEarnings
                .Where(e => e.VehicleId == vehicleId && e.Date >= startDate && e.Date <= endDate)
                .ToListAsync();

            var expenses = await _context.VehicleExpenses
                .Where(e => e.VehicleId == vehicleId && e.Date >= startDate && e.Date <= endDate)
                .ToListAsync();

            var totalEarnings = earnings.Sum(e => e.Amount);
            var totalExpenses = expenses.Sum(e => e.Amount);
            var netProfit = totalEarnings - totalExpenses;
            var profitMargin = totalEarnings > 0 ? (netProfit / totalEarnings) * 100 : 0;

            var earningsBreakdown = earnings
                .GroupBy(e => e.Source)
                .Select(g => new
                {
                    source = g.Key,
                    amount = g.Sum(e => e.Amount),
                    percentage = totalEarnings > 0 ? (g.Sum(e => e.Amount) / totalEarnings) * 100 : 0
                })
                .ToList();

            var expensesBreakdown = expenses
                .GroupBy(e => e.Category)
                .Select(g => new
                {
                    category = g.Key,
                    amount = g.Sum(e => e.Amount),
                    percentage = totalExpenses > 0 ? (g.Sum(e => e.Amount) / totalExpenses) * 100 : 0
                })
                .ToList();

            var report = new
            {
                vehicleId = vehicle.Id,
                vehicleRegistration = vehicle.Registration,
                vehicleMake = vehicle.Make,
                vehicleModel = vehicle.Model,
                period = new
                {
                    startDate,
                    endDate
                },
                totalEarnings,
                totalExpenses,
                netProfit,
                profitMargin,
                earningsBreakdown,
                expensesBreakdown,
                isProfitable = netProfit > 0
            };

            return Ok(report);
        }
    }
}
