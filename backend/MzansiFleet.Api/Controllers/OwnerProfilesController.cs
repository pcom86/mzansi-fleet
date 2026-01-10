using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Application.Handlers;
using MzansiFleet.Repository;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OwnerProfilesController : ControllerBase
    {
        private readonly CreateOwnerProfileCommandHandler _createOwnerProfileHandler;
        private readonly MzansiFleetDbContext _context;

        public OwnerProfilesController(
            CreateOwnerProfileCommandHandler createOwnerProfileHandler,
            MzansiFleetDbContext context)
        {
            _createOwnerProfileHandler = createOwnerProfileHandler;
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<OwnerProfile>>> GetAll()
        {
            var owners = await _context.OwnerProfiles
                .Include(o => o.User)
                .ToListAsync();
            return Ok(owners);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<OwnerProfile>> GetById(Guid id)
        {
            var owner = await _context.OwnerProfiles
                .Include(o => o.User)
                .FirstOrDefaultAsync(o => o.Id == id);
            
            if (owner == null)
                return NotFound();

            return Ok(owner);
        }

        [HttpPost]
        public ActionResult<OwnerProfile> Create([FromBody] CreateOwnerProfileCommand command)
        {
            var result = _createOwnerProfileHandler.Handle(command, CancellationToken.None).Result;
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
    }
}

