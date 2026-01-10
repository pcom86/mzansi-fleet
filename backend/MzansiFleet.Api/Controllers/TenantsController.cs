using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Application.Handlers;
using MzansiFleet.Domain.Interfaces.IRepositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TenantsController : ControllerBase
    {
        private readonly CreateTenantCommandHandler _createTenantHandler;
        private readonly ITenantRepository _tenantRepository;

        public TenantsController(
            CreateTenantCommandHandler createTenantHandler,
            ITenantRepository tenantRepository)
        {
            _createTenantHandler = createTenantHandler;
            _tenantRepository = tenantRepository;
        }

        [HttpGet]
        public ActionResult<IEnumerable<Tenant>> GetAll()
        {
            var tenants = _tenantRepository.GetAll();
            return Ok(tenants);
        }

        [HttpGet("{id}")]
        public ActionResult<Tenant> GetById(Guid id)
        {
            var tenant = _tenantRepository.GetById(id);
            if (tenant == null)
                return NotFound();
            return Ok(tenant);
        }

        [HttpGet("code/{code}")]
        public ActionResult<Tenant> GetByCode(string code)
        {
            var tenant = _tenantRepository.GetAll().FirstOrDefault(t => t.Code == code);
            if (tenant == null)
                return NotFound();
            return Ok(tenant);
        }

        [HttpPost]
        public async Task<ActionResult<Tenant>> Create([FromBody] CreateTenantCommand command)
        {
            try
            {
                var result = await _createTenantHandler.Handle(command, CancellationToken.None);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (Exception ex)
            {
                var innerMessage = ex.InnerException?.Message ?? ex.Message;
                return BadRequest(new { message = innerMessage, fullError = ex.ToString() });
            }
        }
    }
}
