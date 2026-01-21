using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
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
    [Authorize]
    public class ServiceProviderProfilesController : ControllerBase
    {
        private readonly IServiceProviderProfileRepository _repository;

        public ServiceProviderProfilesController(IServiceProviderProfileRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        public ActionResult<IEnumerable<ServiceProviderProfileDto>> GetAll()
        {
            var profiles = _repository.GetAll();
            var dtos = profiles.Select(p => MapToDto(p));
            return Ok(dtos);
        }

        [HttpGet("active")]
        public ActionResult<IEnumerable<ServiceProviderProfileDto>> GetActive()
        {
            var profiles = _repository.GetActiveProviders();
            var dtos = profiles.Select(p => MapToDto(p));
            return Ok(dtos);
        }

        [HttpGet("available")]
        public ActionResult<IEnumerable<ServiceProviderProfileDto>> GetAvailable()
        {
            var profiles = _repository.GetAvailableProviders();
            var dtos = profiles.Select(p => MapToDto(p));
            return Ok(dtos);
        }

        [HttpGet("{id}")]
        public ActionResult<ServiceProviderProfileDto> GetById(Guid id)
        {
            var profile = _repository.GetById(id);
            if (profile == null)
                return NotFound();

            return Ok(MapToDto(profile));
        }

        [HttpGet("user/{userId}")]
        public ActionResult<ServiceProviderProfileDto> GetByUserId(Guid userId)
        {
            var profile = _repository.GetByUserId(userId);
            if (profile == null)
                return NotFound();

            return Ok(MapToDto(profile));
        }

        [HttpPost]
        public ActionResult<ServiceProviderProfileDto> Create([FromBody] CreateServiceProviderProfileDto dto)
        {
            var profile = new ServiceProviderProfile
            {
                Id = Guid.NewGuid(),
                UserId = dto.UserId,
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
                IsAvailable = true,
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

            _repository.Add(profile);
            return CreatedAtAction(nameof(GetById), new { id = profile.Id }, MapToDto(profile));
        }

        [HttpPut("{id}")]
        public ActionResult<ServiceProviderProfileDto> Update(Guid id, [FromBody] ServiceProviderProfileDto dto)
        {
            var profile = _repository.GetById(id);
            if (profile == null)
                return NotFound();

            profile.BusinessName = dto.BusinessName;
            profile.RegistrationNumber = dto.RegistrationNumber;
            profile.ContactPerson = dto.ContactPerson;
            profile.Phone = dto.Phone;
            profile.Email = dto.Email;
            profile.Address = dto.Address;
            profile.ServiceTypes = dto.ServiceTypes;
            profile.VehicleCategories = dto.VehicleCategories;
            profile.OperatingHours = dto.OperatingHours;
            profile.IsActive = dto.IsActive;
            profile.IsAvailable = dto.IsAvailable;
            profile.HourlyRate = dto.HourlyRate;
            profile.CallOutFee = dto.CallOutFee;
            profile.ServiceRadiusKm = dto.ServiceRadiusKm;
            profile.BankAccount = dto.BankAccount;
            profile.TaxNumber = dto.TaxNumber;
            profile.CertificationsLicenses = dto.CertificationsLicenses;
            profile.Notes = dto.Notes;
            profile.UpdatedAt = DateTime.UtcNow;

            _repository.Update(profile);
            return Ok(MapToDto(profile));
        }

        [HttpPatch("{id}/toggle-availability")]
        public ActionResult<ServiceProviderProfileDto> ToggleAvailability(Guid id)
        {
            var profile = _repository.GetById(id);
            if (profile == null)
                return NotFound();

            profile.IsAvailable = !profile.IsAvailable;
            profile.UpdatedAt = DateTime.UtcNow;
            _repository.Update(profile);

            return Ok(MapToDto(profile));
        }

        [HttpDelete("{id}")]
        public ActionResult Delete(Guid id)
        {
            var profile = _repository.GetById(id);
            if (profile == null)
                return NotFound();

            _repository.Delete(id);
            return NoContent();
        }

        [HttpGet("my-profile")]
        public ActionResult<ServiceProviderProfileDto> GetMyProfile()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException());
            var profile = _repository.GetByUserId(userId);
            
            if (profile == null)
                return NotFound("Service provider profile not found for this user");

            return Ok(MapToDto(profile));
        }

        [HttpPut("my-profile")]
        public ActionResult<ServiceProviderProfileDto> UpdateMyProfile([FromBody] ServiceProviderProfileDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException());
            var profile = _repository.GetByUserId(userId);
            
            if (profile == null)
                return NotFound("Service provider profile not found for this user");

            profile.BusinessName = dto.BusinessName;
            profile.RegistrationNumber = dto.RegistrationNumber;
            profile.ContactPerson = dto.ContactPerson;
            profile.Phone = dto.Phone;
            profile.Email = dto.Email;
            profile.Address = dto.Address;
            profile.ServiceTypes = dto.ServiceTypes;
            profile.VehicleCategories = dto.VehicleCategories;
            profile.OperatingHours = dto.OperatingHours;
            profile.IsActive = dto.IsActive;
            profile.IsAvailable = dto.IsAvailable;
            profile.HourlyRate = dto.HourlyRate;
            profile.CallOutFee = dto.CallOutFee;
            profile.ServiceRadiusKm = dto.ServiceRadiusKm;
            profile.BankAccount = dto.BankAccount;
            profile.TaxNumber = dto.TaxNumber;
            profile.CertificationsLicenses = dto.CertificationsLicenses;
            profile.Notes = dto.Notes;
            profile.UpdatedAt = DateTime.UtcNow;

            _repository.Update(profile);
            return Ok(MapToDto(profile));
        }

        private ServiceProviderProfileDto MapToDto(ServiceProviderProfile profile)
        {
            return new ServiceProviderProfileDto
            {
                Id = profile.Id,
                UserId = profile.UserId,
                BusinessName = profile.BusinessName,
                RegistrationNumber = profile.RegistrationNumber,
                ContactPerson = profile.ContactPerson,
                Phone = profile.Phone,
                Email = profile.Email,
                Address = profile.Address,
                ServiceTypes = profile.ServiceTypes,
                VehicleCategories = profile.VehicleCategories,
                OperatingHours = profile.OperatingHours,
                IsActive = profile.IsActive,
                IsAvailable = profile.IsAvailable,
                HourlyRate = profile.HourlyRate,
                CallOutFee = profile.CallOutFee,
                ServiceRadiusKm = profile.ServiceRadiusKm,
                BankAccount = profile.BankAccount,
                TaxNumber = profile.TaxNumber,
                CertificationsLicenses = profile.CertificationsLicenses,
                Rating = profile.Rating,
                TotalReviews = profile.TotalReviews,
                Notes = profile.Notes,
                CreatedAt = profile.CreatedAt,
                UpdatedAt = profile.UpdatedAt
            };
        }
    }
}
