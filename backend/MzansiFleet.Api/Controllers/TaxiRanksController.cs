#nullable enable
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TaxiRanksController : ControllerBase
    {
        private readonly ITaxiRankRepository _rankRepository;

        public TaxiRanksController(ITaxiRankRepository rankRepository)
        {
            _rankRepository = rankRepository;
        }

        // GET: api/TaxiRanks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaxiRank>>> GetAll([FromQuery] Guid? tenantId = null)
        {
            if (tenantId.HasValue)
            {
                var ranks = await _rankRepository.GetByTenantIdAsync(tenantId.Value);
                return Ok(ranks);
            }
            
            var allRanks = await _rankRepository.GetAllAsync();
            return Ok(allRanks);
        }

        // GET: api/TaxiRanks/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<TaxiRank>> GetById(Guid id)
        {
            var rank = await _rankRepository.GetByIdAsync(id);
            if (rank == null)
                return NotFound();

            return Ok(rank);
        }

        // GET: api/TaxiRanks/code/{code}
        [HttpGet("code/{code}")]
        public async Task<ActionResult<TaxiRank>> GetByCode(string code)
        {
            var rank = await _rankRepository.GetByCodeAsync(code);
            if (rank == null)
                return NotFound();

            return Ok(rank);
        }

        // POST: api/TaxiRanks
        [HttpPost]
        public async Task<ActionResult<TaxiRank>> Create([FromBody] CreateTaxiRankDto dto)
        {
            try
            {
                var rank = new TaxiRank
                {
                    Id = Guid.NewGuid(),
                    TenantId = dto.TenantId,
                    Name = dto.Name,
                    Code = dto.Code,
                    Address = dto.Address,
                    City = dto.City,
                    Province = dto.Province,
                    Latitude = dto.Latitude,
                    Longitude = dto.Longitude,
                    Capacity = dto.Capacity,
                    OperatingHours = string.IsNullOrWhiteSpace(dto.OperatingHours) ? null : dto.OperatingHours,
                    Status = "Active",
                    Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes,
                    CreatedAt = DateTime.UtcNow
                };

                await _rankRepository.AddAsync(rank);
                return CreatedAtAction(nameof(GetById), new { id = rank.Id }, rank);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message, innerMessage = ex.InnerException?.Message, fullError = ex.ToString() });
            }
        }

        // PUT: api/TaxiRanks/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult> Update(Guid id, [FromBody] UpdateTaxiRankDto dto)
        {
            var rank = await _rankRepository.GetByIdAsync(id);
            if (rank == null)
                return NotFound();

            rank.Name = dto.Name ?? rank.Name;
            rank.Address = dto.Address ?? rank.Address;
            rank.City = dto.City ?? rank.City;
            rank.Province = dto.Province ?? rank.Province;
            rank.Latitude = dto.Latitude ?? rank.Latitude;
            rank.Longitude = dto.Longitude ?? rank.Longitude;
            rank.Capacity = dto.Capacity ?? rank.Capacity;
            rank.OperatingHours = dto.OperatingHours ?? rank.OperatingHours;
            rank.Status = dto.Status ?? rank.Status;
            rank.Notes = dto.Notes ?? rank.Notes;

            await _rankRepository.UpdateAsync(rank);
            return Ok(rank);
        }

        // DELETE: api/TaxiRanks/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(Guid id)
        {
            var rank = await _rankRepository.GetByIdAsync(id);
            if (rank == null)
                return NotFound();

            await _rankRepository.DeleteAsync(id);
            return NoContent();
        }
    }

    // DTOs
    public class CreateTaxiRankDto
    {
        public Guid TenantId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Province { get; set; } = string.Empty;
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public int? Capacity { get; set; }
        public string? OperatingHours { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdateTaxiRankDto
    {
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Province { get; set; } = string.Empty;
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public int? Capacity { get; set; }
        public string OperatingHours { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
    }
}
