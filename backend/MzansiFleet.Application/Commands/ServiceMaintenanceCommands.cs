using System;
using MediatR;
using MzansiFleet.Domain.Entities;

namespace MzansiFleet.Application.Commands
{
    // Service History Commands
    public class CreateServiceHistoryCommand : IRequest<ServiceHistory>
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public DateTime ServiceDate { get; set; }
        public string ServiceType { get; set; }
        public string Description { get; set; }
        public int MileageAtService { get; set; }
        public decimal Cost { get; set; }
        public string ServiceProvider { get; set; }
        public DateTime? NextServiceDate { get; set; }
        public int? NextServiceMileage { get; set; }
        public string Notes { get; set; }
        public string InvoiceNumber { get; set; }
    }

    public class UpdateServiceHistoryCommand : IRequest<ServiceHistory>
    {
        public Guid Id { get; set; }
        public DateTime ServiceDate { get; set; }
        public string ServiceType { get; set; }
        public string Description { get; set; }
        public int MileageAtService { get; set; }
        public decimal Cost { get; set; }
        public string ServiceProvider { get; set; }
        public DateTime? NextServiceDate { get; set; }
        public int? NextServiceMileage { get; set; }
        public string Notes { get; set; }
        public string InvoiceNumber { get; set; }
    }

    public class DeleteServiceHistoryCommand : IRequest<Unit>
    {
        public Guid Id { get; set; }
    }

    // Maintenance History Commands
    public class CreateMaintenanceHistoryCommand : IRequest<MaintenanceHistory>
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public DateTime MaintenanceDate { get; set; }
        public string MaintenanceType { get; set; }
        public string Component { get; set; }
        public string Description { get; set; }
        public int MileageAtMaintenance { get; set; }
        public decimal Cost { get; set; }
        public string ServiceProvider { get; set; }
        public string Priority { get; set; }
        public string Status { get; set; }
        public DateTime? ScheduledDate { get; set; }
        public DateTime? CompletedDate { get; set; }
        public string Notes { get; set; }
        public string InvoiceNumber { get; set; }
        public string PerformedBy { get; set; }
    }

    public class UpdateMaintenanceHistoryCommand : IRequest<MaintenanceHistory>
    {
        public Guid Id { get; set; }
        public DateTime MaintenanceDate { get; set; }
        public string MaintenanceType { get; set; }
        public string Component { get; set; }
        public string Description { get; set; }
        public int MileageAtMaintenance { get; set; }
        public decimal Cost { get; set; }
        public string ServiceProvider { get; set; }
        public string Priority { get; set; }
        public string Status { get; set; }
        public DateTime? ScheduledDate { get; set; }
        public DateTime? CompletedDate { get; set; }
        public string Notes { get; set; }
        public string InvoiceNumber { get; set; }
        public string PerformedBy { get; set; }
    }

    public class DeleteMaintenanceHistoryCommand : IRequest<Unit>
    {
        public Guid Id { get; set; }
    }
}
