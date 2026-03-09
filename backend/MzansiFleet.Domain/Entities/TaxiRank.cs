using System;
using System.Collections.Generic;

namespace MzansiFleet.Domain.Entities
{
    /// <summary>
    /// Represents a physical taxi rank location
    /// </summary>
    public class TaxiRank
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        
        // Rank Details
        public string Name { get; set; } = string.Empty; // e.g., "Johannesburg Park Station"
        public string Code { get; set; } = string.Empty; // Unique code for the rank
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Province { get; set; } = string.Empty;
        
        // Location Coordinates (optional for mapping)
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        
        // Rank Information
        public int? Capacity { get; set; } // Number of vehicles the rank can accommodate
        public string? OperatingHours { get; set; } // e.g., "24/7" or "05:00-22:00"
        public string Status { get; set; } = "Active"; // Active, Inactive, UnderMaintenance
        
        // Metadata
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation Properties
        public Tenant? Tenant { get; set; }
        public ICollection<TaxiMarshalProfile> Marshals { get; set; } = new List<TaxiMarshalProfile>();
        public ICollection<TaxiRankTrip> Trips { get; set; } = new List<TaxiRankTrip>();
        public ICollection<TaxiRankAdminProfile> Admins { get; set; } = new List<TaxiRankAdminProfile>();
        public ICollection<VehicleTaxiRank> AssignedVehicles { get; set; } = new List<VehicleTaxiRank>();
        public ICollection<TripSchedule> Schedules { get; set; } = new List<TripSchedule>();
        public ICollection<DailyTaxiQueue> DailyQueues { get; set; } = new List<DailyTaxiQueue>();
        
        // Many-to-many relationship with Associations (Tenants)
        public ICollection<TaxiRankAssociation> Associations { get; set; } = new List<TaxiRankAssociation>();
    }

    /// <summary>
    /// Profile for Taxi Rank Administrators
    /// </summary>
    public class TaxiRankAdminProfile
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public Guid TenantId { get; set; }
        public Guid TaxiRankId { get; set; } // The rank this admin manages
        
        // Admin Details
        public string AdminCode { get; set; } = string.Empty; // Unique admin identifier
        public string FullName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string? Email { get; set; }
        
        // Employment Details
        public DateTime HireDate { get; set; }
        public string Status { get; set; } = "Active"; // Active, Suspended, Inactive
        public string? IdNumber { get; set; }
        public string? Address { get; set; }
        
        // Permissions
        public bool CanManageMarshals { get; set; } = true;
        public bool CanManageVehicles { get; set; } = true;
        public bool CanManageSchedules { get; set; } = true;
        public bool CanViewReports { get; set; } = true;
        
        // Metadata
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation Properties
        public User? User { get; set; }
        public Tenant? Tenant { get; set; }
        public TaxiRank? TaxiRank { get; set; }
    }

    /// <summary>
    /// Links vehicles to taxi ranks
    /// </summary>
    public class VehicleTaxiRank
    {
        public Guid Id { get; set; }
        public Guid VehicleId { get; set; }
        public Guid TaxiRankId { get; set; }
        public DateTime AssignedDate { get; set; } = DateTime.UtcNow;
        public DateTime? RemovedDate { get; set; }
        public bool IsActive { get; set; } = true;
        public string? Notes { get; set; }
        
        // Navigation Properties
        public Vehicle? Vehicle { get; set; }
        public TaxiRank? TaxiRank { get; set; }
    }

    /// <summary>
    /// Represents scheduled trips for a taxi rank route
    /// </summary>
    public class TripSchedule
    {
        public Guid Id { get; set; }
        public Guid TaxiRankId { get; set; }
        public Guid TenantId { get; set; }
        
        // Schedule Details
        public string RouteName { get; set; } = string.Empty; // e.g., "JHB to PTA"
        public string DepartureStation { get; set; } = string.Empty;
        public string DestinationStation { get; set; } = string.Empty;
        
        // Timing
        public TimeSpan DepartureTime { get; set; } // Time of day for departure
        public int FrequencyMinutes { get; set; } // How often trips run (e.g., every 30 minutes)
        public string DaysOfWeek { get; set; } = string.Empty; // e.g., "Mon,Tue,Wed,Thu,Fri"
        
        // Pricing
        public decimal StandardFare { get; set; }
        public int? ExpectedDurationMinutes { get; set; }
        public int? MaxPassengers { get; set; }
        
        // Status
        public bool IsActive { get; set; } = true;
        public string? Notes { get; set; }
        
        // Metadata
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation Properties
        public TaxiRank? TaxiRank { get; set; }
        public Tenant? Tenant { get; set; }
        public ICollection<RouteStop> Stops { get; set; } = new List<RouteStop>();
        public ICollection<RouteVehicle> RouteVehicles { get; set; } = new List<RouteVehicle>();
    }

    /// <summary>
    /// Represents an intermediate stop on a scheduled route with its fare
    /// </summary>
    public class RouteStop
    {
        public Guid Id { get; set; }
        public Guid TripScheduleId { get; set; }
        public string StopName { get; set; } = string.Empty;
        public int StopOrder { get; set; }          // 1-based order along the route
        public decimal FareFromOrigin { get; set; } // Fare to board at origin and alight here
        public int? EstimatedMinutesFromDeparture { get; set; }
        public string? StopNotes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        [System.Text.Json.Serialization.JsonIgnore]
        public TripSchedule? TripSchedule { get; set; }
    }

    /// <summary>
    /// Represents a specific scheduled trip instance (not the route template)
    /// </summary>
    public class ScheduledTrip
    {
        public Guid Id { get; set; }
        public Guid TripScheduleId { get; set; } // Links to the route template
        public Guid TaxiRankId { get; set; }
        public Guid TenantId { get; set; }
        
        // Specific trip details
        public DateTime ScheduledDate { get; set; } // The specific date this trip occurs
        public TimeSpan ScheduledTime { get; set; } // The specific time this trip occurs
        public DateTime ScheduledDateTime => ScheduledDate.Date.Add(ScheduledTime);
        
        // Trip execution details
        public Guid? VehicleId { get; set; }
        public Guid? DriverId { get; set; }
        public Guid? MarshalId { get; set; }
        
        // Status tracking
        public string Status { get; set; } = "Scheduled"; // Scheduled, InProgress, Completed, Cancelled
        public DateTime? ActualDepartureTime { get; set; }
        public DateTime? ActualArrivalTime { get; set; }
        public int? ActualPassengerCount { get; set; }
        public decimal? ActualFareCollected { get; set; }
        
        // Cancellation details
        public DateTime? CancelledAt { get; set; }
        public string? CancellationReason { get; set; }
        public string? CancelledBy { get; set; } // User ID who cancelled
        
        // Metadata
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation Properties
        public TripSchedule? TripSchedule { get; set; }
        public TaxiRank? TaxiRank { get; set; }
        public Vehicle? Vehicle { get; set; }
        public DriverProfile? Driver { get; set; }
        public TaxiMarshalProfile? Marshal { get; set; }
    }

    /// <summary>
    /// Represents a taxi rank trip captured by a marshal
    /// </summary>
    public class TaxiRankTrip
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid VehicleId { get; set; }
        public Guid? DriverId { get; set; }
        public Guid? MarshalId { get; set; } // ID of the marshal profile who captured this trip
        public Guid TaxiRankId { get; set; } // The rank where this trip originated
        
        // Trip Details
        public string DepartureStation { get; set; } = string.Empty;
        public string DestinationStation { get; set; } = string.Empty;
        public DateTime DepartureTime { get; set; }
        public DateTime? ArrivalTime { get; set; }
        
        // Financial Summary
        public decimal TotalAmount { get; set; } // Total earnings from all passengers
        public decimal TotalCosts { get; set; } // Total costs added by driver
        public decimal NetAmount { get; set; } // TotalAmount - TotalCosts
        
        // Trip Status
        public string Status { get; set; } = "Departed"; // Departed, InTransit, Arrived, Completed
        public int PassengerCount { get; set; }
        
        // Metadata
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation Properties
        public Vehicle? Vehicle { get; set; }
        public DriverProfile? Driver { get; set; }
        public TaxiMarshalProfile? Marshal { get; set; }
        public TaxiRank? TaxiRank { get; set; }
        public ICollection<TripPassenger> Passengers { get; set; } = new List<TripPassenger>();
        public ICollection<TripCost> Costs { get; set; } = new List<TripCost>();
    }

    /// <summary>
    /// Represents a passenger on a taxi rank trip
    /// </summary>
    public class TripPassenger
    {
        public Guid Id { get; set; }
        public Guid TaxiRankTripId { get; set; }
        public Guid UserId { get; set; } // User who made the booking
        
        // Passenger Details
        public string? PassengerName { get; set; }
        public string? PassengerPhone { get; set; }
        public string DepartureStation { get; set; } = string.Empty;
        public string ArrivalStation { get; set; } = string.Empty;
        
        // Financial
        public decimal Amount { get; set; } // Amount paid by this passenger
        
        // Seat Information
        public int? SeatNumber { get; set; }
        
        // Metadata
        public DateTime BoardedAt { get; set; } = DateTime.UtcNow;
        public string? Notes { get; set; }
        
        // Navigation Property
        public TaxiRankTrip? TaxiRankTrip { get; set; }
        public User? User { get; set; }
    }

    /// <summary>
    /// Represents costs added by the driver for a trip
    /// </summary>
    public class TripCost
    {
        public Guid Id { get; set; }
        public Guid TaxiRankTripId { get; set; }
        public Guid AddedByDriverId { get; set; }
        
        // Cost Details
        public string Category { get; set; } = string.Empty; // Fuel, Tolls, Parking, Snacks, etc.
        public decimal Amount { get; set; }
        public string Description { get; set; } = string.Empty;
        public string? ReceiptNumber { get; set; }
        
        // Metadata
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation Properties
        public TaxiRankTrip? TaxiRankTrip { get; set; }
        public DriverProfile? AddedByDriver { get; set; }
    }

    /// <summary>
    /// Daily queue of available taxis for a taxi rank
    /// </summary>
    public class DailyTaxiQueue
    {
        public Guid Id { get; set; }
        public Guid TaxiRankId { get; set; }
        public Guid VehicleId { get; set; }
        public Guid? DriverId { get; set; }
        public Guid TenantId { get; set; }
        
        // Queue Details
        public DateTime QueueDate { get; set; } // Date for this queue entry
        public TimeSpan AvailableFrom { get; set; } // When the taxi becomes available
        public TimeSpan? AvailableUntil { get; set; } // When the taxi is no longer available
        public int Priority { get; set; } = 1; // Priority in queue (1 = highest)
        public string Status { get; set; } = "Available"; // Available, Assigned, OutOfService
        
        // Assignment Details (when taxi is assigned to a trip)
        public Guid? AssignedTripId { get; set; } // ID of the trip this taxi was assigned to
        public DateTime? AssignedAt { get; set; }
        public Guid? AssignedByUserId { get; set; } // User who assigned this taxi
        
        // Metadata
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation Properties
        public TaxiRank? TaxiRank { get; set; }
        public Vehicle? Vehicle { get; set; }
        public DriverProfile? Driver { get; set; }
        public User? AssignedByUser { get; set; }
        public Trip? AssignedTrip { get; set; }
        public Tenant? Tenant { get; set; }
    }

    /// <summary>
    /// Profile for Taxi Marshals
    /// </summary>
    public class TaxiMarshalProfile
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public Guid TenantId { get; set; }
        public Guid TaxiRankId { get; set; } // The rank where this marshal operates
        
        // Marshal Details
        public string MarshalCode { get; set; } = string.Empty; // Unique marshal identifier
        public string FullName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string? Email { get; set; }
        
        // Employment Details
        public DateTime HireDate { get; set; }
        public string Status { get; set; } = "Active"; // Active, Suspended, Inactive
        public string? IdNumber { get; set; }
        public string? Address { get; set; }
        
        // Metadata
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation Properties
        public User? User { get; set; }
        public Tenant? Tenant { get; set; }
        public TaxiRank? TaxiRank { get; set; }
    }

    /// <summary>
    /// Represents a user booking a seat on a scheduled taxi rank trip
    /// </summary>
    public class ScheduledTripBooking
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public Guid TripScheduleId { get; set; }
        public Guid TaxiRankId { get; set; }
        
        // Booking Details
        public DateTime TravelDate { get; set; } // The specific date the user wants to travel
        public int SeatsBooked { get; set; } = 1;
        public decimal TotalFare { get; set; }
        
        // Payment Information
        public string PaymentMethod { get; set; } = string.Empty; // ozow, wallet, cash
        public string PaymentStatus { get; set; } = "Pending"; // Pending, Paid, Failed, Refunded
        public string? PaymentReference { get; set; }
        public DateTime? PaidAt { get; set; }
        
        // Status: Pending, Confirmed, Cancelled, Completed, NoShow
        public string Status { get; set; } = "Pending";
        public string? Notes { get; set; }
        public string? CancellationReason { get; set; }
        
        // Metadata
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public DateTime? ConfirmedAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        
        // Navigation Properties
        public User? User { get; set; }
        public TripSchedule? TripSchedule { get; set; }
        public TaxiRank? TaxiRank { get; set; }
        public ICollection<BookingPassenger> Passengers { get; set; } = new List<BookingPassenger>();
    }

    /// <summary>
    /// Represents passenger details for a booking
    /// </summary>
    public class BookingPassenger
    {
        public Guid Id { get; set; }
        public Guid BookingId { get; set; }
        
        // Passenger Details
        public string Name { get; set; } = string.Empty;
        public string ContactNumber { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? IdNumber { get; set; }
        public string? Address { get; set; }
        public string Destination { get; set; } = string.Empty; // If different from route destination
        
        // Metadata
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation Properties
        public ScheduledTripBooking? Booking { get; set; }
    }

    /// <summary>
    /// Junction table linking vehicles to routes (many-to-many)
    /// </summary>
    public class RouteVehicle
    {
        public Guid Id { get; set; }
        public Guid TripScheduleId { get; set; }
        public Guid VehicleId { get; set; }
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;
        public string? Notes { get; set; }

        // Navigation Properties
        [System.Text.Json.Serialization.JsonIgnore]
        public TripSchedule? TripSchedule { get; set; }
        public Vehicle? Vehicle { get; set; }
    }
}
