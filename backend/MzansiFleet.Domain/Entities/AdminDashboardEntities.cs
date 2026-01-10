using System;
using System.Collections.Generic;

namespace MzansiFleet.Domain.Entities
{
    public class Route
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Origin { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        public List<string> Stops { get; set; } = new List<string>();
        public decimal Distance { get; set; }
        public int EstimatedDuration { get; set; } // in minutes
        public decimal FareAmount { get; set; }
        public string Status { get; set; } = "Active";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    public class OwnerAssignment
    {
        public Guid Id { get; set; }
        public Guid OwnerId { get; set; }
        public Guid TaxiRankId { get; set; }
        public DateTime AssignedDate { get; set; } = DateTime.UtcNow;
        public string Status { get; set; } = "Active";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public OwnerProfile? Owner { get; set; }
        public TaxiRank? TaxiRank { get; set; }
    }

    public class VehicleRouteAssignment
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public Guid RouteId { get; set; }
        public DateTime AssignedDate { get; set; } = DateTime.UtcNow;
        public string Status { get; set; } = "Active";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public Vehicle? Vehicle { get; set; }
        public Route? Route { get; set; }
    }

    public class Trip
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public Guid RouteId { get; set; }
        public Guid DriverId { get; set; }
        public DateTime TripDate { get; set; }
        public string DepartureTime { get; set; } = string.Empty;
        public string? ArrivalTime { get; set; }
        public List<Passenger> Passengers { get; set; } = new List<Passenger>();
        public int PassengerCount { get; set; }
        public decimal TotalFare { get; set; }
        public string? Notes { get; set; }
        public string Status { get; set; } = "Completed";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Passenger
    {
        public Guid Id { get; set; }
        public Guid TripId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? ContactNumber { get; set; }
        public string? NextOfKin { get; set; }
        public string? NextOfKinContact { get; set; }
        public string? Address { get; set; }
        public string? Destination { get; set; }
        public decimal FareAmount { get; set; }
    }

    public class VehicleEarning
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public Guid? TripId { get; set; }
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
