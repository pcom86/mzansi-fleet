using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Domain.Interfaces.IRepositories;
using MzansiFleet.Repository;

#nullable disable

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TaxiRankTripsController : ControllerBase
    {
        private readonly ITaxiRankTripRepository _tripRepository;
        private readonly ITripPassengerRepository _passengerRepository;
        private readonly ITripCostRepository _costRepository;
        private readonly IVehicleRepository _vehicleRepository;
        private readonly MzansiFleetDbContext _context;

        public TaxiRankTripsController(
            ITaxiRankTripRepository tripRepository,
            ITripPassengerRepository passengerRepository,
            ITripCostRepository costRepository,
            IVehicleRepository vehicleRepository,
            MzansiFleetDbContext context)
        {
            _tripRepository = tripRepository;
            _passengerRepository = passengerRepository;
            _costRepository = costRepository;
            _vehicleRepository = vehicleRepository;
            _context = context;
        }

        // GET: api/TaxiRankTrips
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetAll([FromQuery] Guid? tenantId = null)
        {
            IEnumerable<TaxiRankTrip> trips;
            
            if (tenantId.HasValue)
            {
                trips = await _tripRepository.GetByTenantIdAsync(tenantId.Value);
            }
            else
            {
                trips = await _tripRepository.GetAllAsync();
            }
            
            // Get the actual passenger counts from TripPassengers table
            var tripIds = trips.Select(t => t.Id).ToList();
            var passengerCounts = await _context.TripPassengers
                .Where(p => tripIds.Contains(p.TaxiRankTripId))
                .GroupBy(p => p.TaxiRankTripId)
                .Select(g => new { TripId = g.Key, Count = g.Count() })
                .ToListAsync();
            
            var passengerCountDict = passengerCounts.ToDictionary(p => p.TripId, p => p.Count);
            
            // Return trips with actual passenger count
            var result = trips.Select(trip => new
            {
                trip.Id,
                trip.VehicleId,
                trip.DriverId,
                trip.MarshalId,
                trip.TaxiRankId,
                trip.DepartureStation,
                trip.DestinationStation,
                trip.DepartureTime,
                trip.ArrivalTime,
                trip.Status,
                PassengerCount = passengerCountDict.GetValueOrDefault(trip.Id, 0),
                trip.TotalAmount,
                trip.Notes,
                trip.TenantId,
                trip.CreatedAt,
                trip.UpdatedAt,
                trip.Vehicle,
                trip.Driver,
                trip.Marshal
            });
            
            return Ok(result);
        }

        // GET: api/TaxiRankTrips/{id}
        [HttpGet("{id:guid}")]
        public async Task<ActionResult<TaxiRankTrip>> GetById(Guid id)
        {
            var trip = await _tripRepository.GetByIdAsync(id);
            if (trip == null)
                return NotFound();

            return Ok(trip);
        }

        // GET: api/TaxiRankTrips/{id}/details
        [HttpGet("{id:guid}/details")]
        public async Task<ActionResult<object>> GetTripDetails(Guid id)
        {
            try
            {
                var trip = await _context.TaxiRankTrips
                    .Include(t => t.Vehicle)
                    .Include(t => t.Driver)
                    .Include(t => t.Marshal)
                    .Include(t => t.TaxiRank)
                    .FirstOrDefaultAsync(t => t.Id == id);

                if (trip == null)
                    return NotFound(new { message = "Trip not found" });

                // Get passengers for this trip
                var passengers = await _context.TripPassengers
                    .Where(p => p.TaxiRankTripId == id)
                    .OrderBy(p => p.SeatNumber ?? 999)
                    .ToListAsync();

                // Get costs for this trip
                var costs = await _context.TripCosts
                    .Where(c => c.TaxiRankTripId == id)
                    .OrderByDescending(c => c.CreatedAt)
                    .ToListAsync();

                var result = new
                {
                    Trip = new
                    {
                        trip.Id,
                        trip.TenantId,
                        trip.VehicleId,
                        trip.DriverId,
                        trip.MarshalId,
                        trip.TaxiRankId,
                        trip.DepartureStation,
                        trip.DestinationStation,
                        trip.DepartureTime,
                        trip.ArrivalTime,
                        trip.Status,
                        trip.PassengerCount,
                        trip.TotalAmount,
                        trip.TotalCosts,
                        trip.NetAmount,
                        trip.Notes,
                        trip.CompletedAt,
                        trip.Latitude,
                        trip.Longitude,
                        trip.CreatedAt,
                        trip.UpdatedAt,
                        Vehicle = trip.Vehicle != null ? new
                        {
                            trip.Vehicle.Id,
                            trip.Vehicle.Make,
                            trip.Vehicle.Model,
                            trip.Vehicle.Registration,
                            trip.Vehicle.Type,
                            trip.Vehicle.Capacity,
                            trip.Vehicle.Year
                        } : null,
                        Driver = trip.Driver != null ? new
                        {
                            trip.Driver.Id,
                            trip.Driver.Name,
                            trip.Driver.Phone
                        } : null,
                        Marshal = trip.Marshal != null ? new
                        {
                            trip.Marshal.Id,
                            trip.Marshal.FullName,
                            trip.Marshal.PhoneNumber,
                            trip.Marshal.MarshalCode
                        } : null,
                        TaxiRank = trip.TaxiRank != null ? new
                        {
                            trip.TaxiRank.Id,
                            trip.TaxiRank.Name,
                            trip.TaxiRank.Code,
                            trip.TaxiRank.Address,
                            trip.TaxiRank.City,
                            trip.TaxiRank.Province
                        } : null
                    },
                    Passengers = passengers.Select(p => new
                    {
                        p.Id,
                        p.TaxiRankTripId,
                        p.UserId,
                        p.PassengerName,
                        p.PassengerPhone,
                        p.DepartureStation,
                        p.ArrivalStation,
                        p.Amount,
                        p.PaymentMethod,
                        p.PaymentReference,
                        p.SeatNumber,
                        p.BoardedAt,
                        p.Notes
                    }).ToList(),
                    Costs = costs.Select(c => new
                    {
                        c.Id,
                        c.TaxiRankTripId,
                        c.AddedByDriverId,
                        c.Category,
                        c.Amount,
                        c.Description,
                        c.ReceiptNumber,
                        c.CreatedAt
                    }).ToList(),
                    Summary = new
                    {
                        TotalPassengers = passengers.Count,
                        TotalEarnings = passengers.Sum(p => p.Amount),
                        CashEarnings = passengers.Where(p => (p.PaymentMethod ?? "Cash") == "Cash").Sum(p => p.Amount),
                        CardEarnings = passengers.Where(p => (p.PaymentMethod ?? "Cash") == "Card").Sum(p => p.Amount),
                        TotalCosts = costs.Sum(c => c.Amount),
                        NetEarnings = passengers.Sum(p => p.Amount) - costs.Sum(c => c.Amount)
                    }
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, details = ex.InnerException?.Message });
            }
        }

        // GET: api/TaxiRankTrips/vehicle/{vehicleId}
        [HttpGet("vehicle/{vehicleId:guid}")]
        public async Task<ActionResult<IEnumerable<TaxiRankTrip>>> GetByVehicle(Guid vehicleId)
        {
            var trips = await _tripRepository.GetByVehicleIdAsync(vehicleId);
            return Ok(trips);
        }

        // GET: api/TaxiRankTrips/driver/{driverId}
        [HttpGet("driver/{driverId:guid}")]
        public async Task<ActionResult<IEnumerable<TaxiRankTrip>>> GetByDriver(Guid driverId)
        {
            var trips = await _tripRepository.GetByDriverIdAsync(driverId);
            return Ok(trips);
        }

        // GET: api/TaxiRankTrips/driver/{driverId}/dispatched
        [HttpGet("driver/{driverId:guid}/dispatched")]
        public async Task<ActionResult<IEnumerable<object>>> GetDispatchedTripsForDriver(Guid driverId)
        {
            try
            {
                var trips = await _context.TaxiRankTrips
                    .Include(t => t.Vehicle)
                    .Include(t => t.TaxiRank)
                    .Where(t => t.DriverId == driverId && 
                                (t.Status == "Departed" || t.Status == "InTransit"))
                    .OrderByDescending(t => t.DepartureTime)
                    .ToListAsync();

                var result = trips.Select(trip => new
                {
                    trip.Id,
                    trip.VehicleId,
                    trip.TaxiRankId,
                    trip.DepartureStation,
                    trip.DestinationStation,
                    trip.DepartureTime,
                    trip.Status,
                    trip.PassengerCount,
                    trip.TotalAmount,
                    trip.Notes,
                    trip.CreatedAt,
                    Vehicle = trip.Vehicle != null ? new
                    {
                        trip.Vehicle.Id,
                        trip.Vehicle.Make,
                        trip.Vehicle.Model,
                        trip.Vehicle.Registration,
                        trip.Vehicle.Type,
                        trip.Vehicle.Year
                    } : null,
                    TaxiRank = trip.TaxiRank != null ? new
                    {
                        trip.TaxiRank.Id,
                        trip.TaxiRank.Name,
                        trip.TaxiRank.Code,
                        trip.TaxiRank.Address,
                        trip.TaxiRank.City,
                        trip.TaxiRank.Province
                    } : null,
                    CanComplete = trip.Status == "Departed" || trip.Status == "InTransit"
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, details = ex.InnerException?.Message });
            }
        }

        // GET: api/TaxiRankTrips/marshal/{marshalId}
        [HttpGet("marshal/{marshalId:guid}")]
        public async Task<ActionResult<IEnumerable<TaxiRankTrip>>> GetByMarshal(Guid marshalId)
        {
            var trips = await _tripRepository.GetByMarshalIdAsync(marshalId);
            return Ok(trips);
        }

        // GET: api/TaxiRankTrips/driver/{driverId}/active
        [HttpGet("driver/{driverId:guid}/active")]
        public async Task<ActionResult> GetActiveTripsForDriver(Guid driverId)
        {
            try
            {
                // Find trips directly assigned to this driver
                var trips = await _context.TaxiRankTrips
                    .Include(t => t.Vehicle)
                    .Include(t => t.Driver)
                    .Include(t => t.Marshal)
                    .Include(t => t.Passengers)
                    .Include(t => t.Costs)
                    .Where(t => t.Status != "Completed" && t.Status != "Cancelled")
                    .Where(t => t.DriverId == driverId)
                    .OrderByDescending(t => t.DepartureTime)
                    .ToListAsync();

                // If no direct match, try fallback via vehicle assignment
                if (!trips.Any())
                {
                    var driverProfile = await _context.DriverProfiles.FindAsync(driverId);
                    if (driverProfile?.AssignedVehicleId != null)
                    {
                        trips = await _context.TaxiRankTrips
                            .Include(t => t.Vehicle)
                            .Include(t => t.Driver)
                            .Include(t => t.Marshal)
                            .Include(t => t.Passengers)
                            .Include(t => t.Costs)
                            .Where(t => t.Status != "Completed" && t.Status != "Cancelled")
                            .Where(t => t.VehicleId == driverProfile.AssignedVehicleId.Value)
                            .OrderByDescending(t => t.DepartureTime)
                            .ToListAsync();
                    }
                }

                var result = trips.Select(t =>
                {
                    var driverName = t.Driver?.Name;
                    var driverPhone = t.Driver?.Phone;

                    return new
                    {
                        t.Id, t.TenantId, t.VehicleId, t.DriverId, t.MarshalId, t.TaxiRankId,
                        t.DepartureStation, t.DestinationStation, t.DepartureTime, t.ArrivalTime,
                        t.TotalAmount, t.TotalCosts, t.NetAmount, t.Status, t.PassengerCount,
                        t.Notes, t.CompletedAt, t.Latitude, t.Longitude, t.CreatedAt, t.UpdatedAt,
                        driverName,
                        driverPhone,
                        vehicle = t.Vehicle == null ? null : new
                        {
                            t.Vehicle.Id, t.Vehicle.Registration, t.Vehicle.Make, t.Vehicle.Model,
                            t.Vehicle.Type, t.Vehicle.Capacity
                        },
                        driver = driverName != null ? new { name = driverName, phone = driverPhone } : null,
                        marshal = t.Marshal == null ? null : new { t.Marshal.Id, name = t.Marshal.FullName },
                        passengers = (t.Passengers ?? new List<TripPassenger>()).Select(p => new
                        {
                            p.Id, p.PassengerName, p.PassengerPhone, p.DepartureStation, p.ArrivalStation,
                            p.Amount, p.PaymentMethod, p.SeatNumber
                        }),
                        costs = (t.Costs ?? new List<TripCost>()).Select(c => new
                        {
                            c.Id, c.Category, c.Description, c.Amount, c.ReceiptNumber
                        }),
                    };
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, details = ex.InnerException?.Message });
            }
        }

        // GET: api/TaxiRankTrips/rank/{taxiRankId}
        [HttpGet("rank/{taxiRankId:guid}")]
        public async Task<ActionResult> GetByTaxiRank(Guid taxiRankId)
        {
            try
            {
                var trips = await _tripRepository.GetByTaxiRankIdAsync(taxiRankId);

                // Build a lookup of driver names by VehicleId for fallback
                var vehicleIds = trips.Where(t => t.Driver == null).Select(t => t.VehicleId).Distinct().ToList();
                var driverNameLookup = new Dictionary<Guid, string>();
                var driverPhoneLookup = new Dictionary<Guid, string>();
                if (vehicleIds.Any())
                {
                    var fallbackDrivers = await _context.DriverProfiles
                        .Where(d => d.AssignedVehicleId != null && vehicleIds.Contains(d.AssignedVehicleId.Value))
                        .Select(d => new { VehicleId = d.AssignedVehicleId!.Value, d.Name, d.Phone })
                        .ToListAsync();
                    foreach (var fd in fallbackDrivers)
                    {
                        driverNameLookup[fd.VehicleId] = fd.Name;
                        driverPhoneLookup[fd.VehicleId] = fd.Phone;
                    }
                }

                var result = trips.Select(t =>
                {
                    var driverName = t.Driver?.Name;
                    var driverPhone = t.Driver?.Phone;
                    if (string.IsNullOrEmpty(driverName))
                    {
                        driverNameLookup.TryGetValue(t.VehicleId, out driverName);
                        driverPhoneLookup.TryGetValue(t.VehicleId, out driverPhone);
                    }

                    return new
                    {
                        t.Id, t.TenantId, t.VehicleId, t.DriverId, t.MarshalId, t.TaxiRankId,
                        t.DepartureStation, t.DestinationStation, t.DepartureTime, t.ArrivalTime,
                        t.TotalAmount, t.TotalCosts, t.NetAmount, t.Status, t.PassengerCount,
                        t.Notes, t.CompletedAt, t.Latitude, t.Longitude, t.CreatedAt, t.UpdatedAt,
                        driverName,
                        driverPhone,
                        vehicle = t.Vehicle == null ? null : new
                        {
                            t.Vehicle.Id, t.Vehicle.Registration, t.Vehicle.Make, t.Vehicle.Model,
                            t.Vehicle.Type, t.Vehicle.Capacity
                        },
                        driver = driverName != null ? new { name = driverName, phone = driverPhone } : null,
                        marshal = t.Marshal == null ? null : new { t.Marshal.Id, name = t.Marshal.FullName },
                        passengers = (t.Passengers ?? new List<TripPassenger>()).Select(p => new
                        {
                            p.Id, p.PassengerName, p.PassengerPhone, p.DepartureStation, p.ArrivalStation,
                            p.Amount, p.PaymentMethod, p.SeatNumber, p.NextOfKinName, p.NextOfKinContact
                        }),
                        costs = (t.Costs ?? new List<TripCost>()).Select(c => new
                        {
                            c.Id, c.Category, c.Description, c.Amount, c.ReceiptNumber
                        }),
                    };
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, details = ex.InnerException?.Message, stack = ex.StackTrace?.Substring(0, Math.Min(ex.StackTrace?.Length ?? 0, 500)) });
            }
        }

        // GET: api/TaxiRankTrips/available?taxiRankId={taxiRankId}&routeId={routeId}
        [HttpGet("available")]
        public async Task<ActionResult<IEnumerable<AvailableTripDto>>> GetAvailableTrips([FromQuery] Guid taxiRankId, [FromQuery] Guid? routeId = null, [FromQuery] string? origin = null, [FromQuery] string? destination = null)
        {
            string departureStation = string.Empty;
            string destinationStation = string.Empty;
            decimal fareAmount = 0;

            // Try to get route information
            if (routeId.HasValue)
            {
                var route = await _context.Routes.FindAsync(routeId.Value);
                if (route != null)
                {
                    departureStation = route.DepartureStation;
                    destinationStation = route.DestinationStation;
                    fareAmount = route.StandardFare;
                }
            }

            // Fallback to direct parameters if route not found or not provided
            if (string.IsNullOrEmpty(departureStation) && !string.IsNullOrEmpty(origin))
            {
                departureStation = origin;
            }
            if (string.IsNullOrEmpty(destinationStation) && !string.IsNullOrEmpty(destination))
            {
                destinationStation = destination;
            }

            // If we still don't have stations, return empty result
            if (string.IsNullOrEmpty(departureStation) || string.IsNullOrEmpty(destinationStation))
            {
                return Ok(new List<AvailableTripDto>());
            }

            // Get trips that match the taxi rank and route (by stations)
            // Allow booking for trips departing at least 15 minutes from now
            // Use South Africa time (UTC+2)
            var nowSouthAfrica = DateTime.UtcNow.AddHours(2);
            var cutoffTime = nowSouthAfrica.AddMinutes(15);
            
            var trips = await _context.TaxiRankTrips
                .Include(t => t.Vehicle)
                .Include(t => t.Driver)
                .Where(t => t.TaxiRankId == taxiRankId &&
                           t.DepartureStation == departureStation &&
                           t.DestinationStation == destinationStation &&
                           t.Status != "Arrived" &&
                           t.Status != "Completed" &&
                           t.DepartureTime > cutoffTime &&
                           t.Vehicle != null)
                .ToListAsync();

            var availableTrips = new List<AvailableTripDto>();

            foreach (var trip in trips)
            {
                var availableSeats = trip.Vehicle?.Capacity - trip.PassengerCount ?? 0;
                if (availableSeats > 0)
                {
                    availableTrips.Add(new AvailableTripDto
                    {
                        Id = trip.Id.ToString(),
                        DepartureTime = trip.DepartureTime.ToString("HH:mm"),
                        DepartureDate = trip.DepartureTime.ToString("yyyy-MM-dd"),
                        VehicleRegistration = trip.Vehicle?.Registration ?? "Unknown Vehicle",
                        VehicleMake = trip.Vehicle?.Make ?? "",
                        VehicleModel = trip.Vehicle?.Model ?? "",
                        VehicleYear = trip.Vehicle?.Year ?? 0,
                        VehicleType = trip.Vehicle?.Type ?? "",
                        VehicleStatus = trip.Vehicle?.Status ?? "",
                        DriverName = trip.Driver?.Name ?? "Unknown Driver",
                        DriverPhone = trip.Driver?.Phone ?? "",
                        DriverExperience = trip.Driver?.Experience ?? "",
                        DriverCategory = trip.Driver?.Category ?? "",
                        DriverIsActive = trip.Driver?.IsActive ?? false,
                        DriverIsAvailable = trip.Driver?.IsAvailable ?? false,
                        AvailableSeats = availableSeats,
                        MaxPassengers = trip.Vehicle?.Capacity ?? 0,
                        FareAmount = fareAmount > 0 ? fareAmount : 50 // Default fare if not found
                    });
                }
            }

            return Ok(availableTrips);
        }

        // GET: api/TaxiRankTrips/today
        [HttpGet("today")]
        public async Task<ActionResult<IEnumerable<object>>> GetTodaysTrips([FromQuery] Guid? tenantId = null)
        {
            try
            {
                // Use local time for 'today' to match user expectation
                var localNow = DateTime.Now;
                var today = localNow.Date;
                var tomorrow = today.AddDays(1);

                var query = _context.TaxiRankTrips
                    .Where(t => t.DepartureTime >= today && t.DepartureTime < tomorrow)
                    .Include(t => t.Vehicle)
                    .Include(t => t.Driver)
                    .Include(t => t.Marshal)
                    .AsQueryable();

                if (tenantId.HasValue)
                {
                    query = query.Where(t => t.TenantId == tenantId.Value);
                }

                var trips = await query.ToListAsync();

                var result = trips.Select(t => new
                {
                    id = t.Id.ToString(),
                    departureTime = t.DepartureTime.ToString("o"), // ISO format
                    vehicle = t.Vehicle != null ? new { registration = t.Vehicle.Registration } : null,
                    driver = t.Driver != null ? new { name = t.Driver.Name } : null,
                    marshal = t.Marshal != null ? new { fullName = t.Marshal.FullName } : null,
                    departureStation = t.DepartureStation,
                    destinationStation = t.DestinationStation,
                    status = t.Status,
                    passengerCount = t.PassengerCount,
                    totalAmount = t.TotalAmount
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}\n{ex.StackTrace}");
            }
        }

        // POST: api/TaxiRankTrips/migrate-userid
        [HttpPost("migrate-userid")]
        public async Task<IActionResult> MigrateUserId()
        {
            try
            {
                // Execute raw SQL to add UserId column
                await _context.Database.ExecuteSqlRawAsync(@"
                    DO $$ 
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 
                            FROM information_schema.columns 
                            WHERE table_name = 'TripPassengers' 
                            AND column_name = 'UserId'
                        ) THEN
                            ALTER TABLE ""TripPassengers"" 
                            ADD COLUMN ""UserId"" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
                            
                            ALTER TABLE ""TripPassengers""
                            ADD CONSTRAINT ""FK_TripPassengers_Users_UserId"" 
                            FOREIGN KEY (""UserId"") REFERENCES ""Users""(""Id"") ON DELETE CASCADE;
                            
                            CREATE INDEX ""IX_TripPassengers_UserId"" ON ""TripPassengers"" (""UserId"");
                            
                            RAISE NOTICE 'UserId column added to TripPassengers';
                        ELSE
                            RAISE NOTICE 'UserId column already exists in TripPassengers';
                        END IF;
                    END $$;
                ");
                
                return Ok("Migration completed successfully");
            }
            catch (Exception ex)
            {
                return BadRequest($"Migration failed: {ex.Message}");
            }
        }

        // GET: api/TaxiRankTrips/user/{userId}
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<BookedTripDto>>> GetUserBookings(string userId)
        {
            Console.WriteLine($"[GetUserBookings] Called with userId: {userId}");

            if (!Guid.TryParse(userId, out var userGuid))
            {
                Console.WriteLine($"[GetUserBookings] Invalid user ID format: {userId}");
                return BadRequest("Invalid user ID format");
            }

            Console.WriteLine($"[GetUserBookings] Parsed userGuid: {userGuid}");

            // Ensure UserId column exists
            try
            {
                Console.WriteLine("[GetUserBookings] Checking if UserId column exists...");
                await _context.Database.ExecuteSqlRawAsync(@"
                    ALTER TABLE ""TripPassengers"" 
                    ADD COLUMN IF NOT EXISTS ""UserId"" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
                ");
                Console.WriteLine("[GetUserBookings] UserId column check completed");
            }
            catch (Exception migrationEx)
            {
                Console.WriteLine($"[GetUserBookings] Migration failed: {migrationEx.Message}");
                // Continue anyway
            }

            var tripPassengers = await _context.TripPassengers
                .Where(tp => tp.UserId == userGuid)
                .ToListAsync();

            Console.WriteLine($"[GetUserBookings] Found {tripPassengers.Count} trip passengers for user {userGuid}");

            var userBookings = await _context.TripPassengers
                .Where(tp => tp.UserId == userGuid && tp.TaxiRankTrip != null)
                .Include(tp => tp.TaxiRankTrip)
                .ThenInclude(t => t.Vehicle)
                .Include(tp => tp.TaxiRankTrip)
                .ThenInclude(t => t.Driver)
                .Select(tp => new BookedTripDto
                {
                    Id = tp.TaxiRankTrip.Id.ToString(),
                    DepartureTime = tp.TaxiRankTrip.DepartureTime.ToString("HH:mm"),
                    DepartureDate = tp.TaxiRankTrip.DepartureTime.ToString("yyyy-MM-dd"),
                    VehicleRegistration = tp.TaxiRankTrip.Vehicle != null ? tp.TaxiRankTrip.Vehicle.Registration : "N/A",
                    VehicleMake = tp.TaxiRankTrip.Vehicle != null ? tp.TaxiRankTrip.Vehicle.Make : "N/A",
                    VehicleModel = tp.TaxiRankTrip.Vehicle != null ? tp.TaxiRankTrip.Vehicle.Model : "N/A",
                    DriverName = tp.TaxiRankTrip.Driver != null ? tp.TaxiRankTrip.Driver.Name : "N/A",
                    DriverPhone = tp.TaxiRankTrip.Driver != null ? tp.TaxiRankTrip.Driver.Phone : "N/A",
                    DepartureStation = tp.TaxiRankTrip.DepartureStation,
                    DestinationStation = tp.TaxiRankTrip.DestinationStation,
                    Status = tp.TaxiRankTrip.Status,
                    BookingDate = tp.BoardedAt.ToString("yyyy-MM-dd HH:mm"),
                    Amount = tp.Amount,
                    SeatNumber = tp.SeatNumber,
                    Notes = tp.Notes
                })
                .ToListAsync();

            Console.WriteLine($"[GetUserBookings] Returning {userBookings.Count} bookings");

            return Ok(userBookings);
        }

        // POST: api/TaxiRankTrips
        [HttpPost]
        public async Task<ActionResult<TaxiRankTrip>> Create([FromBody] CreateTripDto dto)
        {
            var trip = new TaxiRankTrip
            {
                Id = Guid.NewGuid(),
                TenantId = dto.TenantId,
                VehicleId = dto.VehicleId,
                DriverId = dto.DriverId,
                MarshalId = dto.MarshalId,
                TaxiRankId = dto.TaxiRankId,
                DepartureStation = dto.DepartureStation,
                DestinationStation = dto.DestinationStation,
                DepartureTime = dto.DepartureTime ?? DateTime.UtcNow,
                Status = "Loading",
                PassengerCount = 0,
                TotalAmount = 0,
                TotalCosts = 0,
                NetAmount = 0,
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow
            };

            await _tripRepository.AddAsync(trip);

            // Create initial earnings record
            var earnings = new VehicleEarnings
            {
                Id = Guid.NewGuid(),
                VehicleId = trip.VehicleId,
                Date = trip.DepartureTime,
                Amount = 0, // Will be updated as passengers are added
                Source = $"{trip.DepartureStation} → {trip.DestinationStation}",
                Description = $"Trip from {trip.DepartureStation} to {trip.DestinationStation}",
                Period = "Daily",
                CreatedAt = DateTime.UtcNow
            };

            _context.VehicleEarnings.Add(earnings);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = trip.Id }, trip);
        }

        // POST: api/TaxiRankTrips/{id}/passengers
        [HttpPost("{id:guid}/passengers")]
        public async Task<ActionResult<TripPassenger>> AddPassenger(Guid id, [FromBody] AddPassengerDto dto)
        {
            var trip = await _tripRepository.GetByIdAsync(id);
            if (trip == null)
                return NotFound("Trip not found");

            // Get current user ID from claims
            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized("User not authenticated");

            var passenger = new TripPassenger
            {
                Id = Guid.NewGuid(),
                TaxiRankTripId = id,
                UserId = userId,
                PassengerName = dto.PassengerName,
                PassengerPhone = dto.PassengerPhone,
                DepartureStation = dto.DepartureStation,
                ArrivalStation = dto.ArrivalStation,
                Amount = dto.Amount,
                PaymentMethod = dto.PaymentMethod ?? "Cash",
                PaymentReference = dto.PaymentReference,
                SeatNumber = dto.SeatNumber,
                Notes = dto.Notes,
                BoardedAt = DateTime.UtcNow
            };

            await _passengerRepository.AddAsync(passenger);

            // Update trip totals
            trip.PassengerCount++;
            trip.TotalAmount += passenger.Amount;
            trip.NetAmount = trip.TotalAmount - trip.TotalCosts;
            await _tripRepository.UpdateAsync(trip);

            // Update earnings record
            var routeName = $"{trip.DepartureStation} → {trip.DestinationStation}";
            var earnings = _context.VehicleEarnings
                .Where(e => e.VehicleId == trip.VehicleId && 
                           e.Date.Date == trip.DepartureTime.Date &&
                           e.Source == routeName)
                .OrderByDescending(e => e.CreatedAt)
                .FirstOrDefault();

            if (earnings != null)
            {
                earnings.Amount = trip.TotalAmount;
                _context.VehicleEarnings.Update(earnings);
                await _context.SaveChangesAsync();
            }

            // Send notifications to taxi rank admins and marshal
            try
            {
                // Get taxi rank with admins
                var taxiRank = await _context.TaxiRanks
                    .Include(tr => tr.Admins)
                        .ThenInclude(a => a.User)
                    .FirstOrDefaultAsync(tr => tr.Id == trip.TaxiRankId);

                if (taxiRank != null)
                {
                    // Send message to all active taxi rank admins
                    foreach (var admin in taxiRank.Admins.Where(a => a.Status == "Active"))
                    {
                        if (admin.User != null)
                        {
                            var adminMessage = new Message
                            {
                                Id = Guid.NewGuid(),
                                SenderType = "User",
                                SenderId = userId,
                                SenderName = "System",
                                RecipientType = "Admin",
                                RecipientId = admin.UserId,
                                Subject = "New Passenger Booking",
                                Content = $"A new passenger '{passenger.PassengerName}' has booked a seat on trip from {trip.DepartureStation} to {trip.DestinationStation} departing at {trip.DepartureTime:yyyy-MM-dd HH:mm}. Seat: {passenger.SeatNumber}, Amount: R{passenger.Amount}",
                                CreatedAt = DateTime.UtcNow,
                                IsRead = false,
                                RelatedEntityType = "Trip",
                                RelatedEntityId = trip.Id
                            };
                            _context.Messages.Add(adminMessage);
                        }
                    }

                    // Send message to assigned marshal if exists
                    if (trip.MarshalId.HasValue)
                    {
                        var marshal = await _context.TaxiMarshalProfiles
                            .Include(m => m.User)
                            .FirstOrDefaultAsync(m => m.Id == trip.MarshalId.Value);

                        if (marshal != null && marshal.User != null)
                        {
                            var marshalMessage = new Message
                            {
                                Id = Guid.NewGuid(),
                                SenderType = "User",
                                SenderId = userId,
                                SenderName = "System",
                                RecipientType = "Marshal",
                                RecipientId = marshal.UserId,
                                Subject = "New Passenger Booking",
                                Content = $"A new passenger '{passenger.PassengerName}' has booked a seat on your assigned trip from {trip.DepartureStation} to {trip.DestinationStation} departing at {trip.DepartureTime:yyyy-MM-dd HH:mm}. Seat: {passenger.SeatNumber}, Amount: R{passenger.Amount}",
                                CreatedAt = DateTime.UtcNow,
                                IsRead = false,
                                RelatedEntityType = "Trip",
                                RelatedEntityId = trip.Id
                            };
                            _context.Messages.Add(marshalMessage);
                        }
                    }

                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                // Log error but don't fail the booking operation
                Console.WriteLine($"[Booking Notification] Failed to send notifications: {ex.Message}");
            }

            return CreatedAtAction(nameof(GetById), new { id = trip.Id }, passenger);
        }

        // POST: api/TaxiRankTrips/{id}/passengers/add
        // Marshal-friendly: userId passed in body instead of JWT
        [HttpPost("{id:guid}/passengers/add")]
        public async Task<ActionResult<TripPassenger>> AddPassengerByMarshal(Guid id, [FromBody] AddPassengerMarshalDto dto)
        {
            var trip = await _tripRepository.GetByIdAsync(id);
            if (trip == null)
                return NotFound("Trip not found");

            var passenger = new TripPassenger
            {
                Id = Guid.NewGuid(),
                TaxiRankTripId = id,
                UserId = dto.UserId ?? Guid.Empty,
                PassengerName = dto.PassengerName,
                PassengerPhone = dto.PassengerPhone,
                DepartureStation = dto.DepartureStation ?? trip.DepartureStation,
                ArrivalStation = dto.ArrivalStation ?? trip.DestinationStation,
                Amount = dto.Amount,
                PaymentMethod = dto.PaymentMethod ?? "Cash",
                PaymentReference = dto.PaymentReference,
                SeatNumber = dto.SeatNumber,
                Notes = dto.Notes,
                BoardedAt = DateTime.UtcNow
            };

            await _passengerRepository.AddAsync(passenger);

            // Update trip totals
            trip.PassengerCount++;
            trip.TotalAmount += passenger.Amount;
            trip.NetAmount = trip.TotalAmount - trip.TotalCosts;
            await _tripRepository.UpdateAsync(trip);

            // Update earnings record
            var routeName = $"{trip.DepartureStation} → {trip.DestinationStation}";
            var earnings = _context.VehicleEarnings
                .Where(e => e.VehicleId == trip.VehicleId &&
                           e.Date.Date == trip.DepartureTime.Date &&
                           e.Source == routeName)
                .OrderByDescending(e => e.CreatedAt)
                .FirstOrDefault();

            if (earnings != null)
            {
                earnings.Amount = trip.TotalAmount;
                _context.VehicleEarnings.Update(earnings);
                await _context.SaveChangesAsync();
            }

            return Ok(passenger);
        }

        // GET: api/TaxiRankTrips/{id}/passengers
        [HttpGet("{id}/passengers")]
        public async Task<ActionResult<IEnumerable<TripPassenger>>> GetPassengers(Guid id)
        {
            var passengers = await _passengerRepository.GetByTripIdAsync(id);
            return Ok(passengers);
        }

        // POST: api/TaxiRankTrips/{id}/costs
        [HttpPost("{id:guid}/costs")]
        public async Task<ActionResult<TripCost>> AddCost(Guid id, [FromBody] AddTripCostDto dto)
        {
            var trip = await _tripRepository.GetByIdAsync(id);
            if (trip == null)
                return NotFound("Trip not found");

            var cost = new TripCost
            {
                Id = Guid.NewGuid(),
                TaxiRankTripId = id,
                AddedByDriverId = dto.AddedByDriverId,
                Category = dto.Category,
                Amount = dto.Amount,
                Description = dto.Description,
                ReceiptNumber = dto.ReceiptNumber,
                CreatedAt = DateTime.UtcNow
            };

            await _costRepository.AddAsync(cost);

            // Update trip totals
            trip.TotalCosts += cost.Amount;
            trip.NetAmount = trip.TotalAmount - trip.TotalCosts;
            await _tripRepository.UpdateAsync(trip);

            // Create expense record
            var expense = new VehicleExpense
            {
                Id = Guid.NewGuid(),
                VehicleId = trip.VehicleId,
                Date = DateTime.UtcNow,
                Amount = cost.Amount,
                Category = cost.Category,
                Description = $"Trip Cost: {cost.Description}",
                InvoiceNumber = cost.ReceiptNumber,
                Vendor = "Trip Expense",
                CreatedAt = DateTime.UtcNow
            };

            _context.VehicleExpenses.Add(expense);
            await _context.SaveChangesAsync();

            return Ok(cost);
        }

        // PUT: api/TaxiRankTrips/{id}/status
        [HttpPut("{id:guid}/status")]
        public async Task<ActionResult> UpdateStatus(Guid id, [FromBody] UpdateTripStatusDto dto)
        {
            var trip = await _tripRepository.GetByIdAsync(id);
            if (trip == null)
                return NotFound();

            trip.Status = dto.Status;
            
            if (dto.Status == "Arrived" && !trip.ArrivalTime.HasValue)
            {
                trip.ArrivalTime = DateTime.UtcNow;
            }

            await _tripRepository.UpdateAsync(trip);
            return Ok(trip);
        }

        // PUT: api/TaxiRankTrips/{id}/complete
        // Completes a trip, finalizes vehicle earnings, and notifies the vehicle owner
        [HttpPut("{id:guid}/complete")]
        public async Task<ActionResult> CompleteTrip(Guid id, [FromBody] CompleteTripDto dto)
        {
            try
            {
                var trip = await _context.TaxiRankTrips
                    .Include(t => t.Vehicle)
                    .FirstOrDefaultAsync(t => t.Id == id);

                if (trip == null)
                    return NotFound(new { message = "Trip not found" });

                if (trip.Status == "Completed")
                    return BadRequest(new { message = "Trip is already completed" });

                // Driver-specific guard: a driver can only complete their own trip.
                if (dto.CompletedByDriverId.HasValue && dto.CompletedByDriverId.Value != Guid.Empty)
                {
                    if (!trip.DriverId.HasValue || trip.DriverId.Value == Guid.Empty)
                    {
                        // Auto-assign the completing driver to this trip
                        trip.DriverId = dto.CompletedByDriverId.Value;
                    }
                    else if (trip.DriverId.Value != dto.CompletedByDriverId.Value)
                    {
                        return Forbid();
                    }
                }

                var completedAt = dto.CompletedAt.HasValue
                    ? (dto.CompletedAt.Value.Kind == DateTimeKind.Unspecified
                        ? DateTime.SpecifyKind(dto.CompletedAt.Value, DateTimeKind.Utc)
                        : dto.CompletedAt.Value.ToUniversalTime())
                    : DateTime.UtcNow;

                // Update trip status and arrival time
                trip.Status = "Completed";
                trip.ArrivalTime = completedAt;
                trip.CompletedAt = completedAt;
                trip.Latitude = dto.Latitude;
                trip.Longitude = dto.Longitude;
                trip.Notes = string.IsNullOrEmpty(dto.Notes) ? trip.Notes : dto.Notes;
                trip.UpdatedAt = completedAt;
                await _tripRepository.UpdateAsync(trip);

                // Get actual passengers and totals
                var passengers = await _context.TripPassengers
                    .Where(p => p.TaxiRankTripId == id)
                    .ToListAsync();

                var cashTotal = passengers.Where(p => (p.PaymentMethod ?? "Cash") == "Cash").Sum(p => p.Amount);
                var cardTotal = passengers.Where(p => (p.PaymentMethod ?? "Cash") == "Card").Sum(p => p.Amount);
                var totalEarnings = passengers.Sum(p => p.Amount);

                // Ensure the vehicle earnings record is finalized
                var routeName = $"{trip.DepartureStation} → {trip.DestinationStation}";
                var earnings = await _context.VehicleEarnings
                    .Where(e => e.VehicleId == trip.VehicleId &&
                               e.Date.Date == trip.DepartureTime.Date &&
                               e.Source == routeName)
                    .OrderByDescending(e => e.CreatedAt)
                    .FirstOrDefaultAsync();

                if (earnings != null)
                {
                    earnings.Amount = totalEarnings;
                    earnings.Description = $"Completed trip: {routeName} | {passengers.Count} passengers | Cash: R{cashTotal}, Card: R{cardTotal}";
                    _context.VehicleEarnings.Update(earnings);
                }
                else
                {
                    // Create earnings record if it doesn't exist
                    var newEarnings = new VehicleEarnings
                    {
                        Id = Guid.NewGuid(),
                        VehicleId = trip.VehicleId,
                        Date = trip.DepartureTime,
                        Amount = totalEarnings,
                        Source = routeName,
                        Description = $"Completed trip: {routeName} | {passengers.Count} passengers | Cash: R{cashTotal}, Card: R{cardTotal}",
                        Period = "Daily",
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.VehicleEarnings.Add(newEarnings);
                }

                await _context.SaveChangesAsync();

                // Find and notify the vehicle owner
                string ownerNotified = "none";
                try
                {
                    if (trip.Vehicle != null)
                    {
                        // Find owner profiles linked to the same tenant as the vehicle
                        var ownerProfiles = await _context.OwnerProfiles
                            .Include(op => op.User)
                            .Where(op => op.User != null && op.User.TenantId == trip.Vehicle.TenantId && op.User.IsActive)
                            .ToListAsync();

                        // Also check OwnerAssignments for the taxi rank
                        if (!ownerProfiles.Any() && trip.TaxiRankId != Guid.Empty)
                        {
                            var ownerAssignments = await _context.OwnerAssignments
                                .Where(oa => oa.TaxiRankId == trip.TaxiRankId && oa.Status == "Active")
                                .ToListAsync();

                            var ownerIds = ownerAssignments.Select(oa => oa.OwnerId).ToList();
                            if (ownerIds.Any())
                            {
                                ownerProfiles = await _context.OwnerProfiles
                                    .Include(op => op.User)
                                    .Where(op => ownerIds.Contains(op.Id) && op.User != null)
                                    .ToListAsync();
                            }
                        }

                        // Get the sender user ID (marshal/admin completing the trip)
                        var senderIdClaim = User.FindFirst("userId")?.Value
                            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                        var senderId = Guid.TryParse(senderIdClaim, out var sid) ? sid : Guid.Empty;

                        var vehicleReg = trip.Vehicle?.Registration ?? "Unknown";
                        foreach (var owner in ownerProfiles)
                        {
                            if (owner.User == null) continue;

                            var message = new Message
                            {
                                Id = Guid.NewGuid(),
                                SenderType = "System",
                                SenderId = senderId,
                                SenderName = "Mzansi Fleet",
                                RecipientType = "Owner",
                                RecipientId = owner.UserId,
                                Subject = $"Trip Completed – {vehicleReg}",
                                Content = $"A trip has been completed for your vehicle {vehicleReg}.\n\n" +
                                         $"Route: {trip.DepartureStation} → {trip.DestinationStation}\n" +
                                         $"Passengers: {passengers.Count}\n" +
                                         $"Total Earnings: R{totalEarnings:F2}\n" +
                                         $"Cash: R{cashTotal:F2} | Card: R{cardTotal:F2}\n" +
                                         $"Completed: {DateTime.UtcNow.AddHours(2):yyyy-MM-dd HH:mm} (SAST)",
                                CreatedAt = DateTime.UtcNow,
                                IsRead = false,
                                RelatedEntityType = "Trip",
                                RelatedEntityId = trip.Id
                            };
                            _context.Messages.Add(message);
                            ownerNotified = owner.User.Email ?? owner.ContactName ?? "yes";
                        }

                        await _context.SaveChangesAsync();
                    }
                }
                catch (Exception notifEx)
                {
                    Console.WriteLine($"[CompleteTrip] Owner notification failed: {notifEx.Message}");
                    ownerNotified = $"error: {notifEx.Message}";
                }

                return Ok(new
                {
                    message = "Trip completed successfully",
                    tripId = trip.Id,
                    status = trip.Status,
                    passengerCount = passengers.Count,
                    totalEarnings,
                    cashTotal,
                    cardTotal,
                    vehicleRegistration = trip.Vehicle?.Registration,
                    ownerNotified
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CompleteTrip] Error: {ex.Message}");
                return StatusCode(500, new
                {
                    error = "Failed to complete trip",
                    message = ex.Message,
                    inner = ex.InnerException?.Message
                });
            }
        }

        // PUT: api/TaxiRankTrips/{id}
        // General update for trip details (vehicle, driver, marshal, time, notes)
        [HttpPut("{id:guid}")]
        public async Task<ActionResult> UpdateTrip(Guid id, [FromBody] UpdateTripDto dto)
        {
            var trip = await _tripRepository.GetByIdAsync(id);
            if (trip == null)
                return NotFound(new { message = "Trip not found" });

            if (dto.VehicleId.HasValue) trip.VehicleId = dto.VehicleId.Value;
            if (dto.DriverId.HasValue) trip.DriverId = dto.DriverId;
            if (dto.MarshalId.HasValue) trip.MarshalId = dto.MarshalId;
            if (!string.IsNullOrEmpty(dto.DepartureStation)) trip.DepartureStation = dto.DepartureStation;
            if (!string.IsNullOrEmpty(dto.DestinationStation)) trip.DestinationStation = dto.DestinationStation;
            if (dto.DepartureTime.HasValue) trip.DepartureTime = dto.DepartureTime.Value;
            if (!string.IsNullOrEmpty(dto.Status)) trip.Status = dto.Status;
            if (dto.Notes != null) trip.Notes = dto.Notes;
            trip.UpdatedAt = DateTime.UtcNow;

            await _tripRepository.UpdateAsync(trip);
            return Ok(trip);
        }

        // DELETE: api/TaxiRankTrips/{id}
        [HttpDelete("{id:guid}")]
        public async Task<ActionResult> Delete(Guid id)
        {
            var trip = await _tripRepository.GetByIdAsync(id);
            if (trip == null)
                return NotFound();

            await _tripRepository.DeleteAsync(id);
            return NoContent();
        }

        // DELETE: api/TaxiRankTrips/{tripId}/passengers/{passengerId}
        [HttpDelete("{tripId:guid}/passengers/{passengerId:guid}")]
        public async Task<ActionResult> DeletePassenger(Guid tripId, Guid passengerId)
        {
            var trip = await _tripRepository.GetByIdAsync(tripId);
            if (trip == null)
                return NotFound("Trip not found");

            var passenger = await _passengerRepository.GetByIdAsync(passengerId);
            if (passenger == null)
                return NotFound("Passenger not found");

            // Update trip totals
            trip.PassengerCount--;
            trip.TotalAmount -= passenger.Amount;
            trip.NetAmount = trip.TotalAmount - trip.TotalCosts;
            await _tripRepository.UpdateAsync(trip);

            await _passengerRepository.DeleteAsync(passengerId);

            return NoContent();
        }
    }

    // DTOs
    public class CreateTripDto
    {
        public Guid TenantId { get; set; }
        public Guid VehicleId { get; set; }
        public Guid? DriverId { get; set; }
        public Guid? MarshalId { get; set; }
        public Guid TaxiRankId { get; set; }
        public string DepartureStation { get; set; } = string.Empty;
        public string DestinationStation { get; set; } = string.Empty;
        public DateTime? DepartureTime { get; set; }
        public string Notes { get; set; }
    }

    public class AddPassengerDto
    {
        public string PassengerName { get; set; }
        public string PassengerPhone { get; set; }
        public string DepartureStation { get; set; } = string.Empty;
        public string ArrivalStation { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = "Cash"; // Cash, Card
        public string? PaymentReference { get; set; }
        public int? SeatNumber { get; set; }
        public string Notes { get; set; }
    }

    public class AddPassengerMarshalDto
    {
        public Guid? UserId { get; set; }
        public string PassengerName { get; set; }
        public string PassengerPhone { get; set; }
        public string DepartureStation { get; set; }
        public string ArrivalStation { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = "Cash"; // Cash, Card
        public string? PaymentReference { get; set; }
        public int? SeatNumber { get; set; }
        public string Notes { get; set; }
    }

    public class AddTripCostDto
    {
        public Guid AddedByDriverId { get; set; }
        public string Category { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Description { get; set; } = string.Empty;
        public string ReceiptNumber { get; set; }
    }

    public class UpdateTripStatusDto
    {
        public string Status { get; set; } = string.Empty;
    }

    public class CompleteTripDto
    {
        public string Notes { get; set; } = string.Empty;
        public Guid? CompletedByDriverId { get; set; }
        public DateTime? CompletedAt { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
    }

    public class UpdateTripDto
    {
        public Guid? VehicleId { get; set; }
        public Guid? DriverId { get; set; }
        public Guid? MarshalId { get; set; }
        public string DepartureStation { get; set; }
        public string DestinationStation { get; set; }
        public DateTime? DepartureTime { get; set; }
        public string Status { get; set; }
        public string Notes { get; set; }
    }

    public class AvailableTripDto
    {
        public string Id { get; set; } = string.Empty;
        public string DepartureTime { get; set; } = string.Empty;
        public string DepartureDate { get; set; } = string.Empty;
        public string VehicleRegistration { get; set; } = string.Empty;
        public string VehicleMake { get; set; } = string.Empty;
        public string VehicleModel { get; set; } = string.Empty;
        public int VehicleYear { get; set; }
        public string VehicleType { get; set; } = string.Empty;
        public string VehicleStatus { get; set; } = string.Empty;
        public string DriverName { get; set; } = string.Empty;
        public string DriverPhone { get; set; } = string.Empty;
        public string DriverExperience { get; set; } = string.Empty;
        public string DriverCategory { get; set; } = string.Empty;
        public bool DriverIsActive { get; set; }
        public bool DriverIsAvailable { get; set; }
        public int AvailableSeats { get; set; }
        public int MaxPassengers { get; set; }
        public decimal FareAmount { get; set; }
    }

    public class BookedTripDto
    {
        public string Id { get; set; } = string.Empty;
        public string DepartureTime { get; set; } = string.Empty;
        public string DepartureDate { get; set; } = string.Empty;
        public string VehicleRegistration { get; set; } = string.Empty;
        public string VehicleMake { get; set; } = string.Empty;
        public string VehicleModel { get; set; } = string.Empty;
        public string DriverName { get; set; } = string.Empty;
        public string DriverPhone { get; set; } = string.Empty;
        public string DepartureStation { get; set; } = string.Empty;
        public string DestinationStation { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string BookingDate { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public int? SeatNumber { get; set; }
        public string Notes { get; set; } = string.Empty;
    }
}

