using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using MzansiFleet.Application.Commands;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Domain.Constants;

namespace MzansiFleet.Application.Handlers
{
    public class RegisterServiceProviderCommandHandler : IRequestHandler<RegisterServiceProviderCommand, ServiceProviderProfile>
    {
        private readonly IUserRepository _userRepository;
        private readonly IServiceProviderProfileRepository _serviceProviderProfileRepository;

        public RegisterServiceProviderCommandHandler(
            IUserRepository userRepository,
            IServiceProviderProfileRepository serviceProviderProfileRepository)
        {
            _userRepository = userRepository;
            _serviceProviderProfileRepository = serviceProviderProfileRepository;
        }

        public Task<ServiceProviderProfile> Handle(RegisterServiceProviderCommand request, CancellationToken cancellationToken)
        {
            // Validate that email doesn't already exist
            var existingUsers = _userRepository.GetAll();
            foreach (var existingUser in existingUsers)
            {
                if (existingUser.Email?.ToLower() == request.Email?.ToLower())
                {
                    throw new InvalidOperationException($"A user with email '{request.Email}' already exists.");
                }
            }

            // Hash the password using BCrypt
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            // Create the User entity
            var userId = Guid.NewGuid();
            var user = new User
            {
                Id = userId,
                TenantId = request.TenantId,
                Email = request.Email,
                Phone = request.Phone,
                PasswordHash = passwordHash,
                Role = Roles.ServiceProvider,
                IsActive = true
            };

            _userRepository.Add(user);

            // Create the ServiceProviderProfile entity
            var profile = new ServiceProviderProfile
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                BusinessName = request.BusinessName,
                RegistrationNumber = request.RegistrationNumber,
                ContactPerson = request.ContactPerson,
                Phone = request.Phone,
                Email = request.Email,
                Address = request.Address,
                ServiceTypes = request.ServiceTypes,
                VehicleCategories = request.VehicleCategories,
                OperatingHours = request.OperatingHours,
                IsActive = true,
                IsAvailable = true,
                HourlyRate = request.HourlyRate,
                CallOutFee = request.CallOutFee,
                ServiceRadiusKm = request.ServiceRadiusKm,
                BankAccount = request.BankAccount,
                TaxNumber = request.TaxNumber,
                CertificationsLicenses = request.CertificationsLicenses,
                Rating = 0.0,
                TotalReviews = 0,
                Notes = request.Notes,
                CreatedAt = DateTime.UtcNow
            };

            _serviceProviderProfileRepository.Add(profile);

            return Task.FromResult(profile);
        }
    }
}
