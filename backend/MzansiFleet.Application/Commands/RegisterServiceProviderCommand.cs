using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Commands
{
    public class RegisterServiceProviderCommand : IRequest<ServiceProviderProfile>
    {
        // User Account Details
        public Guid TenantId { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string Phone { get; set; }
        
        // Service Provider Profile Details
        public string BusinessName { get; set; }
        public string RegistrationNumber { get; set; }
        public string ContactPerson { get; set; }
        public string Address { get; set; }
        public string ServiceTypes { get; set; }
        public string VehicleCategories { get; set; }
        public string OperatingHours { get; set; }
        public decimal? HourlyRate { get; set; }
        public decimal? CallOutFee { get; set; }
        public double? ServiceRadiusKm { get; set; }
        public string BankAccount { get; set; }
        public string TaxNumber { get; set; }
        public string CertificationsLicenses { get; set; }
        public string Notes { get; set; }
    }
}
