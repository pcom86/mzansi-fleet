using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Repository;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QueueMarshalsController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public QueueMarshalsController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        // GET: api/QueueMarshals
        [HttpGet]
        public async Task<ActionResult<IEnumerable<QueueMarshal>>> GetQueueMarshals()
        {
            return await _context.QueueMarshals
                .Include(qm => qm.TaxiRank)
                .OrderBy(qm => qm.FullName)
                .ToListAsync();
        }

        // GET: api/QueueMarshals/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<QueueMarshal>> GetQueueMarshal(Guid id)
        {
            var queueMarshal = await _context.QueueMarshals
                .Include(qm => qm.TaxiRank)
                .FirstOrDefaultAsync(qm => qm.Id == id);

            if (queueMarshal == null)
            {
                return NotFound(new { message = "Queue marshal not found" });
            }

            return queueMarshal;
        }

        // GET: api/QueueMarshals/by-rank/{taxiRankId}
        [HttpGet("by-rank/{taxiRankId}")]
        public async Task<ActionResult<IEnumerable<QueueMarshal>>> GetByTaxiRank(Guid taxiRankId)
        {
            var marshals = await _context.QueueMarshals
                .Where(qm => qm.TaxiRankId == taxiRankId && qm.Status == "Active")
                .OrderBy(qm => qm.FullName)
                .ToListAsync();

            return Ok(marshals);
        }

        // GET: api/QueueMarshals/by-code/{marshalCode}
        [HttpGet("by-code/{marshalCode}")]
        public async Task<ActionResult<IEnumerable<QueueMarshal>>> GetByCode(string marshalCode)
        {
            var marshals = await _context.QueueMarshals
                .Where(qm => qm.MarshalCode.ToUpper() == marshalCode.ToUpper())
                .Include(qm => qm.TaxiRank)
                .ToListAsync();

            return Ok(marshals);
        }

        // GET: api/QueueMarshals/{id}/stats
        [HttpGet("{id}/stats")]
        public async Task<ActionResult<object>> GetMarshalStats(Guid id, [FromQuery] DateTime? date = null)
        {
            var marshal = await _context.QueueMarshals.FindAsync(id);
            if (marshal == null)
                return NotFound(new { message = "Queue marshal not found" });

            var targetDate = date ?? DateTime.Today;
            var startDate = targetDate.Date;
            var endDate = targetDate.Date.AddDays(1).AddTicks(-1);

            // Get today's trip captures
            var todayTrips = await _context.TripCaptures
                .Where(tc => tc.MarshalId == id && tc.CapturedAt >= startDate && tc.CapturedAt <= endDate)
                .ToListAsync();

            // Get pending messages
            var pendingMessages = await _context.Messages
                .Where(m => m.RecipientMarshalId == id && !m.IsRead && m.CreatedAt >= startDate)
                .CountAsync();

            // Get active schedules for marshal's taxi rank
            var activeSchedules = await _context.TripSchedules
                .Where(ts => ts.TaxiRankId == marshal.TaxiRankId && ts.IsActive)
                .CountAsync();

            return Ok(new
            {
                todayTrips = todayTrips.Count,
                pendingMessages = pendingMessages,
                activeSchedules = activeSchedules,
                totalFares = todayTrips.Sum(tc => tc.FareCollected),
                totalPassengers = todayTrips.Sum(tc => tc.PassengerCount)
            });
        }

        // POST: api/QueueMarshals
        [HttpPost]
        public async Task<ActionResult<QueueMarshal>> CreateQueueMarshal(CreateQueueMarshalDto dto)
        {
            // Check if marshal code already exists
            var existingMarshal = await _context.QueueMarshals
                .FirstOrDefaultAsync(qm => qm.MarshalCode.ToUpper() == dto.MarshalCode.ToUpper());

            if (existingMarshal != null)
            {
                return BadRequest(new { message = "Marshal code already exists" });
            }

            // Check if phone number already exists
            var existingPhone = await _context.QueueMarshals
                .FirstOrDefaultAsync(qm => qm.PhoneNumber == dto.PhoneNumber);

            if (existingPhone != null)
            {
                return BadRequest(new { message = "Phone number already registered" });
            }

            var marshal = new QueueMarshal
            {
                Id = Guid.NewGuid(),
                FullName = dto.FullName,
                IdNumber = dto.IdNumber,
                PhoneNumber = dto.PhoneNumber,
                Email = dto.Email,
                MarshalCode = dto.MarshalCode.ToUpper(),
                EmergencyContact = dto.EmergencyContact,
                Experience = dto.Experience,
                TaxiRankId = dto.TaxiRankId,
                Permissions = dto.Permissions,
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = dto.CreatedBy
            };

            _context.QueueMarshals.Add(marshal);
            await _context.SaveChangesAsync();

            // Reload with related entities
            var created = await _context.QueueMarshals
                .Include(qm => qm.TaxiRank)
                .FirstOrDefaultAsync(qm => qm.Id == marshal.Id);

            return CreatedAtAction(nameof(GetQueueMarshal), new { id = created.Id }, created);
        }

        // PUT: api/QueueMarshals/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<QueueMarshal>> UpdateQueueMarshal(Guid id, UpdateQueueMarshalDto dto)
        {
            var marshal = await _context.QueueMarshals.FindAsync(id);
            if (marshal == null)
                return NotFound(new { message = "Queue marshal not found" });

            // Check if marshal code conflicts with another marshal
            if (dto.MarshalCode != marshal.MarshalCode)
            {
                var existingMarshal = await _context.QueueMarshals
                    .FirstOrDefaultAsync(qm => qm.MarshalCode.ToUpper() == dto.MarshalCode.ToUpper() && qm.Id != id);

                if (existingMarshal != null)
                {
                    return BadRequest(new { message = "Marshal code already exists" });
                }
            }

            marshal.FullName = dto.FullName;
            marshal.IdNumber = dto.IdNumber;
            marshal.PhoneNumber = dto.PhoneNumber;
            marshal.Email = dto.Email;
            marshal.MarshalCode = dto.MarshalCode.ToUpper();
            marshal.EmergencyContact = dto.EmergencyContact;
            marshal.Experience = dto.Experience;
            marshal.Permissions = dto.Permissions;
            marshal.Status = dto.Status;
            marshal.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Reload with related entities
            var updated = await _context.QueueMarshals
                .Include(qm => qm.TaxiRank)
                .FirstOrDefaultAsync(qm => qm.Id == id);

            return Ok(updated);
        }

        // DELETE: api/QueueMarshals/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteQueueMarshal(Guid id)
        {
            var marshal = await _context.QueueMarshals.FindAsync(id);
            if (marshal == null)
                return NotFound(new { message = "Queue marshal not found" });

            // Soft delete by setting status to Inactive
            marshal.Status = "Inactive";
            marshal.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Queue marshal deactivated successfully" });
        }
    }

    public class CreateQueueMarshalDto
    {
        public string FullName { get; set; }
        public string IdNumber { get; set; }
        public string PhoneNumber { get; set; }
        public string Email { get; set; }
        public string MarshalCode { get; set; }
        public string EmergencyContact { get; set; }
        public string Experience { get; set; }
        public Guid TaxiRankId { get; set; }
        public MarshalPermissions Permissions { get; set; }
        public Guid CreatedBy { get; set; }
    }

    public class UpdateQueueMarshalDto
    {
        public string FullName { get; set; }
        public string IdNumber { get; set; }
        public string PhoneNumber { get; set; }
        public string Email { get; set; }
        public string MarshalCode { get; set; }
        public string EmergencyContact { get; set; }
        public string Experience { get; set; }
        public MarshalPermissions Permissions { get; set; }
        public string Status { get; set; }
    }
}
