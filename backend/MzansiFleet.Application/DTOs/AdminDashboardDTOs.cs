#nullable enable
using System;
using System.Collections.Generic;

namespace MzansiFleet.Application.DTOs
{
    // Route DTOs
    public class CreateRouteDto
    {
        public Guid TenantId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Origin { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        public List<string> Stops { get; set; } = new List<string>();
        public decimal Distance { get; set; }
        public int EstimatedDuration { get; set; }
        public decimal FareAmount { get; set; }
        public string Status { get; set; } = "Active";
    }

    public class UpdateRouteDto
    {
        public Guid? TenantId { get; set; }
        public string? Code { get; set; }
        public string? Name { get; set; }
        public string? Origin { get; set; }
        public string? Destination { get; set; }
        public List<string>? Stops { get; set; }
        public decimal? Distance { get; set; }
        public int? EstimatedDuration { get; set; }
        public decimal? FareAmount { get; set; }
        public string? Status { get; set; }
    }

    // Owner Assignment DTOs
    public class CreateOwnerAssignmentDto
    {
        public Guid OwnerId { get; set; }
        public Guid TaxiRankId { get; set; }
    }

    // Vehicle Route Assignment DTOs
    public class CreateVehicleRouteAssignmentDto
    {
        public Guid VehicleId { get; set; }
        public Guid RouteId { get; set; }
    }

    // Trip DTOs
    public class CreateTripDto
    {
        public Guid VehicleId { get; set; }
        public Guid RouteId { get; set; }
        public Guid DriverId { get; set; }
        public DateTime TripDate { get; set; }
        public string DepartureTime { get; set; } = string.Empty;
        public string? ArrivalTime { get; set; }
        public List<PassengerDto> Passengers { get; set; } = new List<PassengerDto>();
        public string? Notes { get; set; }
    }

    public class PassengerDto
    {
        public string Name { get; set; } = string.Empty;
        public string? ContactNumber { get; set; }
        public decimal FareAmount { get; set; }
    }

    // Vehicle Earning DTOs
    public class CreateVehicleEarningDto
    {
        public Guid VehicleId { get; set; }
        public Guid? TripId { get; set; }
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public string Description { get; set; } = string.Empty;
    }

    // Trip Schedule DTOs
    public class CreateTripScheduleDto
    {
        public Guid TaxiRankId { get; set; }
        public Guid TenantId { get; set; }
        public string RouteName { get; set; } = string.Empty;
        public string DepartureStation { get; set; } = string.Empty;
        public string DestinationStation { get; set; } = string.Empty;
        public string DepartureTime { get; set; } = string.Empty; // e.g., "08:30:00"
        public int FrequencyMinutes { get; set; }
        public string DaysOfWeek { get; set; } = string.Empty;
        public decimal StandardFare { get; set; }
        public int? ExpectedDurationMinutes { get; set; }
        public int? MaxPassengers { get; set; }
        public bool IsActive { get; set; } = true;
        public string? Notes { get; set; }
    }

    public class UpdateTripScheduleDto
    {
        public string RouteName { get; set; } = string.Empty;
        public string DepartureStation { get; set; } = string.Empty;
        public string DestinationStation { get; set; } = string.Empty;
        public string DepartureTime { get; set; } = string.Empty;
        public int FrequencyMinutes { get; set; }
        public string DaysOfWeek { get; set; } = string.Empty;
        public decimal StandardFare { get; set; }
        public int? ExpectedDurationMinutes { get; set; }
        public int? MaxPassengers { get; set; }
        public bool IsActive { get; set; }
        public string? Notes { get; set; }
    }

    // Marshal DTOs
    public class CreateMarshalDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string MarshalCode { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string ShiftStartTime { get; set; } = string.Empty;
        public string ShiftEndTime { get; set; } = string.Empty;
    }

    public class UpdateMarshalDto
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? ShiftStartTime { get; set; }
        public string? ShiftEndTime { get; set; }
        public string? Status { get; set; }
    }
}
