using System;

namespace MzansiFleet.Domain.Entities
{
    public class QueueMarshal
    {
        public Guid Id { get; set; }
        public string FullName { get; set; }
        public string IdNumber { get; set; }
        public string PhoneNumber { get; set; }
        public string Email { get; set; }
        public string MarshalCode { get; set; }
        public string EmergencyContact { get; set; }
        public string Experience { get; set; }
        public Guid TaxiRankId { get; set; }
        public MarshalPermissions Permissions { get; set; }
        public string Status { get; set; } // Active, Inactive, Suspended
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public Guid? CreatedBy { get; set; }

        // Navigation properties
        public TaxiRank TaxiRank { get; set; }
    }

    public class MarshalPermissions
    {
        public bool CanCaptureTrips { get; set; } = true;
        public bool CanViewSchedules { get; set; } = true;
        public bool CanReceiveMessages { get; set; } = true;
        public bool CanSendMessages { get; set; } = true;
        public bool CanManageVehicles { get; set; } = false;
        public bool CanManageDrivers { get; set; } = false;
        public bool CanManageSchedules { get; set; } = false;
        public bool CanViewReports { get; set; } = false;
        public bool CanDeleteData { get; set; } = false;
    }

    public class TripCapture
    {
        public Guid Id { get; set; }
        public Guid MarshalId { get; set; }
        public Guid RouteId { get; set; }
        public Guid VehicleId { get; set; }
        public Guid TaxiRankId { get; set; }
        public int PassengerCount { get; set; }
        public decimal FareCollected { get; set; }
        public DateTime CapturedAt { get; set; }
        public string Notes { get; set; }
        public string PhotoUri { get; set; }
        public string Status { get; set; } // Completed, Pending, Cancelled, Deleted
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        public QueueMarshal Marshal { get; set; }
        public Route Route { get; set; }
        public Vehicle Vehicle { get; set; }
        public TaxiRank TaxiRank { get; set; }
    }
}
