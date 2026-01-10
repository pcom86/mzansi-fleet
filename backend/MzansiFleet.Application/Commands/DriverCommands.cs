using System;

namespace MzansiFleet.Application.Commands
{
    public class CreateDriverCommand
    {
        public Guid UserId { get; set; }
        public string Name { get; set; }
        public string IdNumber { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string PhotoUrl { get; set; }
        public string LicenseCopy { get; set; }
        public string Experience { get; set; }
        public string Category { get; set; }
        public bool HasPdp { get; set; }
        public string PdpCopy { get; set; }
        public bool IsActive { get; set; }
        public bool IsAvailable { get; set; }
        public Guid? AssignedVehicleId { get; set; }
    }
    public class UpdateDriverCommand
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Name { get; set; }
        public string IdNumber { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string PhotoUrl { get; set; }
        public string LicenseCopy { get; set; }
        public string Experience { get; set; }
        public string Category { get; set; }
        public bool HasPdp { get; set; }
        public string PdpCopy { get; set; }
        public bool IsActive { get; set; }
        public bool IsAvailable { get; set; }
        public Guid? AssignedVehicleId { get; set; }
    }
    public class DeleteDriverCommand
    {
        public Guid Id { get; set; }
    }
}

