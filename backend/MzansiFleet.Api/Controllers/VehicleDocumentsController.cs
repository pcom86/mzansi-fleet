using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VehicleDocumentsController : ControllerBase
    {
        private readonly IVehicleDocumentRepository _repository;

        public VehicleDocumentsController(IVehicleDocumentRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        public ActionResult<IEnumerable<VehicleDocument>> GetAll()
        {
            var documents = _repository.GetAll();
            return Ok(documents);
        }

        [HttpGet("{id}")]
        public ActionResult<VehicleDocument> GetById(Guid id)
        {
            var document = _repository.GetById(id);
            
            if (document == null)
                return NotFound();
            
            return Ok(document);
        }

        [HttpGet("vehicle/{vehicleId}")]
        public ActionResult<IEnumerable<VehicleDocument>> GetByVehicleId(Guid vehicleId)
        {
            var documents = _repository.GetAll()
                .Where(d => d.VehicleId == vehicleId)
                .OrderByDescending(d => d.UploadedAt);
            return Ok(documents);
        }

        [HttpPost]
        public ActionResult<VehicleDocument> Create([FromBody] VehicleDocument document)
        {
            document.Id = Guid.NewGuid();
            _repository.Add(document);
            return CreatedAtAction(nameof(GetById), new { id = document.Id }, document);
        }

        [HttpPut("{id}")]
        public ActionResult<VehicleDocument> Update(Guid id, [FromBody] VehicleDocument document)
        {
            if (id != document.Id)
                return BadRequest("ID mismatch");

            var existing = _repository.GetById(id);
            if (existing == null)
                return NotFound();

            _repository.Update(document);
            return Ok(document);
        }

        [HttpDelete("{id}")]
        public ActionResult Delete(Guid id)
        {
            var document = _repository.GetById(id);
            if (document == null)
                return NotFound();

            _repository.Delete(id);
            return NoContent();
        }
    }
}
