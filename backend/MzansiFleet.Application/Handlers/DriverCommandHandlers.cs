using System.Collections.Generic;
using System.Linq;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Application.Commands;

namespace MzansiFleet.Application.Handlers
{
    public class CreateDriverCommandHandler
    {
        private readonly IDriverProfileRepository _repo;
        public CreateDriverCommandHandler(IDriverProfileRepository repo) { _repo = repo; }
        public DriverProfile Handle(CreateDriverCommand command)
        {
            var driver = new DriverProfile
            {
                Id = System.Guid.NewGuid(),
                UserId = command.UserId,
                Name = command.Name,
                IdNumber = command.IdNumber,
                Phone = command.Phone,
                Email = command.Email,
                PhotoUrl = command.PhotoUrl,
                LicenseCopy = command.LicenseCopy,
                Experience = command.Experience,
                Category = command.Category,
                HasPdp = command.HasPdp,
                PdpCopy = command.PdpCopy,
                IsActive = command.IsActive,
                IsAvailable = command.IsAvailable,
                AssignedVehicleId = command.AssignedVehicleId
            };
            _repo.Add(driver);
            return driver;
        }
    }
    public class UpdateDriverCommandHandler
    {
        private readonly IDriverProfileRepository _repo;
        public UpdateDriverCommandHandler(IDriverProfileRepository repo) { _repo = repo; }
        public void Handle(UpdateDriverCommand command)
        {
            var driver = new DriverProfile
            {
                Id = command.Id,
                UserId = command.UserId,
                Name = command.Name ?? "",
                IdNumber = command.IdNumber ?? "",
                Phone = command.Phone ?? "",
                Email = command.Email ?? "",
                PhotoUrl = command.PhotoUrl ?? "",
                LicenseCopy = command.LicenseCopy ?? "",
                Experience = command.Experience ?? "",
                Category = command.Category ?? "",
                HasPdp = command.HasPdp,
                PdpCopy = command.PdpCopy ?? "",
                IsActive = command.IsActive,
                IsAvailable = command.IsAvailable,
                AssignedVehicleId = command.AssignedVehicleId
            };
            _repo.Update(driver);
        }
    }
    public class DeleteDriverCommandHandler
    {
        private readonly IDriverProfileRepository _repo;
        public DeleteDriverCommandHandler(IDriverProfileRepository repo) { _repo = repo; }
        public void Handle(DeleteDriverCommand command)
        {
            _repo.Delete(command.Id);
        }
    }
}

