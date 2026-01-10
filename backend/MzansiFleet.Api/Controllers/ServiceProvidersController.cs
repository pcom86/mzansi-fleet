using Microsoft.AspNetCore.Mvc;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.DTOs;
using MzansiFleet.Domain.Interfaces.IRepositories;
using System;
using System.Collections.Generic;
using System.Linq;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ServiceProvidersController : ControllerBase
    {
        private readonly IServiceProviderRepository _repository;

        public ServiceProvidersController(IServiceProviderRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        public ActionResult<IEnumerable<ServiceProviderDto>> GetAll()
        {
            var providers = _repository.GetAll();
            var dtos = providers.Select(p => MapToDto(p));
            return Ok(dtos);
        }

        [HttpGet("active")]
        public ActionResult<IEnumerable<ServiceProviderDto>> GetActive()
        {
            var providers = _repository.GetActiveProviders();
            var dtos = providers.Select(p => MapToDto(p));
            return Ok(dtos);
        }

        [HttpGet("by-service-type/{serviceType}")]
        public ActionResult<IEnumerable<ServiceProviderDto>> GetByServiceType(string serviceType)
        {
            var providers = _repository.GetProvidersByServiceType(serviceType);
            var dtos = providers.Select(p => MapToDto(p));
            return Ok(dtos);
        }

        [HttpGet("{id}")]
        public ActionResult<ServiceProviderDto> GetById(Guid id)
        {
            var provider = _repository.GetById(id);
            if (provider == null)
                return NotFound();

            return Ok(MapToDto(provider));
        }

        [HttpPost]
        public ActionResult<ServiceProviderDto> Create([FromBody] CreateServiceProviderDto dto)
        {
            var provider = new ServiceProvider
            {
                Id = Guid.NewGuid(),
                BusinessName = dto.BusinessName,
                RegistrationNumber = dto.RegistrationNumber,
                ContactPerson = dto.ContactPerson,
                Phone = dto.Phone,
                Email = dto.Email,
                Address = dto.Address,
                ServiceTypes = dto.ServiceTypes,
                VehicleCategories = dto.VehicleCategories,
                OperatingHours = dto.OperatingHours,
                IsActive = true,
                HourlyRate = dto.HourlyRate,
                CallOutFee = dto.CallOutFee,
                ServiceRadiusKm = dto.ServiceRadiusKm,
                BankAccount = dto.BankAccount,
                TaxNumber = dto.TaxNumber,
                CertificationsLicenses = dto.CertificationsLicenses,
                Rating = 0,
                TotalReviews = 0,
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow
            };

            _repository.Add(provider);
            return CreatedAtAction(nameof(GetById), new { id = provider.Id }, MapToDto(provider));
        }

        [HttpPut("{id}")]
        public ActionResult<ServiceProviderDto> Update(Guid id, [FromBody] UpdateServiceProviderDto dto)
        {
            var provider = _repository.GetById(id);
            if (provider == null)
                return NotFound();

            provider.BusinessName = dto.BusinessName;
            provider.RegistrationNumber = dto.RegistrationNumber;
            provider.ContactPerson = dto.ContactPerson;
            provider.Phone = dto.Phone;
            provider.Email = dto.Email;
            provider.Address = dto.Address;
            provider.ServiceTypes = dto.ServiceTypes;
            provider.VehicleCategories = dto.VehicleCategories;
            provider.OperatingHours = dto.OperatingHours;
            provider.IsActive = dto.IsActive;
            provider.HourlyRate = dto.HourlyRate;
            provider.CallOutFee = dto.CallOutFee;
            provider.ServiceRadiusKm = dto.ServiceRadiusKm;
            provider.BankAccount = dto.BankAccount;
            provider.TaxNumber = dto.TaxNumber;
            provider.CertificationsLicenses = dto.CertificationsLicenses;
            provider.Notes = dto.Notes;
            provider.UpdatedAt = DateTime.UtcNow;

            _repository.Update(provider);
            return Ok(MapToDto(provider));
        }

        [HttpDelete("{id}")]
        public ActionResult Delete(Guid id)
        {
            var provider = _repository.GetById(id);
            if (provider == null)
                return NotFound();

            _repository.Delete(id);
            return NoContent();
        }

        [HttpPatch("{id}/toggle-status")]
        public ActionResult<ServiceProviderDto> ToggleStatus(Guid id)
        {
            var provider = _repository.GetById(id);
            if (provider == null)
                return NotFound();

            provider.IsActive = !provider.IsActive;
            provider.UpdatedAt = DateTime.UtcNow;
            _repository.Update(provider);

            return Ok(MapToDto(provider));
        }

        private ServiceProviderDto MapToDto(ServiceProvider provider)
        {
            return new ServiceProviderDto
            {
                Id = provider.Id,
                BusinessName = provider.BusinessName,
                RegistrationNumber = provider.RegistrationNumber,
                ContactPerson = provider.ContactPerson,
                Phone = provider.Phone,
                Email = provider.Email,
                Address = provider.Address,
                ServiceTypes = provider.ServiceTypes,
                VehicleCategories = provider.VehicleCategories,
                OperatingHours = provider.OperatingHours,
                IsActive = provider.IsActive,
                HourlyRate = provider.HourlyRate,
                CallOutFee = provider.CallOutFee,
                ServiceRadiusKm = provider.ServiceRadiusKm,
                BankAccount = provider.BankAccount,
                TaxNumber = provider.TaxNumber,
                CertificationsLicenses = provider.CertificationsLicenses,
                Rating = provider.Rating,
                TotalReviews = provider.TotalReviews,
                Notes = provider.Notes,
                CreatedAt = provider.CreatedAt,
                UpdatedAt = provider.UpdatedAt
            };
        }
    }
}
