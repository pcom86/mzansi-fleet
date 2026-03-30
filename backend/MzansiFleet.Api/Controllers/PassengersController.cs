using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Repository;

#nullable disable

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PassengersController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public PassengersController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        // GET: api/Passengers/search?q=name&taxiRankId=xxx
        [HttpGet("search")]
        public async Task<ActionResult> Search([FromQuery] string q = "", [FromQuery] Guid? taxiRankId = null)
        {
            // Search across PassengerProfiles and TripPassengers
            var results = new List<object>();

            // 1. Search PassengerProfiles (registered users with Customer role)
            if (!string.IsNullOrWhiteSpace(q))
            {
                var profileMatches = await _context.PassengerProfiles
                    .Include(p => p.User)
                    .Where(p =>
                        p.Name.ToLower().Contains(q.ToLower()) ||
                        p.Phone.Contains(q) ||
                        p.Email.ToLower().Contains(q.ToLower()))
                    .Take(20)
                    .Select(p => new
                    {
                        p.Id,
                        p.UserId,
                        Name = p.Name,
                        Phone = p.Phone,
                        Email = p.Email,
                        Source = "registered",
                        TripCount = 0,
                        LastTrip = (DateTime?)null
                    })
                    .ToListAsync();

                results.AddRange(profileMatches);
            }

            // 2. Search TripPassengers (anyone who has boarded a trip)
            var tripPassengerQuery = _context.TripPassengers
                .Include(tp => tp.TaxiRankTrip)
                .AsQueryable();

            if (taxiRankId.HasValue)
            {
                tripPassengerQuery = tripPassengerQuery
                    .Where(tp => tp.TaxiRankTrip != null && tp.TaxiRankTrip.TaxiRankId == taxiRankId.Value);
            }

            if (!string.IsNullOrWhiteSpace(q))
            {
                tripPassengerQuery = tripPassengerQuery
                    .Where(tp =>
                        (tp.PassengerName != null && tp.PassengerName.ToLower().Contains(q.ToLower())) ||
                        (tp.PassengerPhone != null && tp.PassengerPhone.Contains(q)));
            }

            var rawTripPassengers = await tripPassengerQuery
                .Take(200)
                .ToListAsync();

            var tripPassengers = rawTripPassengers
                .GroupBy(tp => new { tp.PassengerName, tp.PassengerPhone })
                .Select(g => new
                {
                    Id = g.Max(tp => tp.Id),
                    UserId = g.Max(tp => tp.UserId),
                    Name = g.Key.PassengerName ?? "Unknown",
                    Phone = g.Key.PassengerPhone ?? "",
                    Email = "",
                    Source = "trip_history",
                    TripCount = g.Count(),
                    LastTrip = g.Max(tp => tp.BoardedAt)
                })
                .OrderByDescending(x => x.TripCount)
                .Take(30)
                .ToList();

            // Merge - deduplicate by phone
            var existingPhones = results.Select(r => ((dynamic)r).Phone?.ToString() ?? "").ToHashSet();
            foreach (var tp in tripPassengers)
            {
                if (!string.IsNullOrEmpty(tp.Phone) && existingPhones.Contains(tp.Phone))
                    continue;
                results.Add(tp);
                if (!string.IsNullOrEmpty(tp.Phone))
                    existingPhones.Add(tp.Phone);
            }

            return Ok(results);
        }

        // GET: api/Passengers/details?name=xxx&phone=xxx&userId=xxx
        [HttpGet("details")]
        public async Task<ActionResult> GetPassengerDetails([FromQuery] string name = "", [FromQuery] string phone = "", [FromQuery] Guid? userId = null)
        {
            // Find all trip records matching this passenger by name, phone, or userId
            var query = _context.TripPassengers
                .Include(tp => tp.TaxiRankTrip)
                .AsQueryable();

            if (userId.HasValue && userId.Value != Guid.Empty)
            {
                query = query.Where(tp => tp.UserId == userId.Value);
            }
            else
            {
                var conditions = new List<System.Linq.Expressions.Expression<Func<TripPassenger, bool>>>();
                if (!string.IsNullOrWhiteSpace(name))
                {
                    query = query.Where(tp =>
                        tp.PassengerName != null && tp.PassengerName.ToLower() == name.ToLower());
                }
                else if (!string.IsNullOrWhiteSpace(phone))
                {
                    query = query.Where(tp =>
                        tp.PassengerPhone != null && tp.PassengerPhone == phone);
                }
                else
                {
                    return BadRequest(new { message = "Provide name, phone, or userId" });
                }
            }

            var allTrips = await query
                .OrderByDescending(tp => tp.BoardedAt)
                .Take(100)
                .ToListAsync();

            // Also check PassengerProfiles for registered user info
            PassengerProfile profile = null;
            if (userId.HasValue && userId.Value != Guid.Empty)
            {
                profile = await _context.PassengerProfiles
                    .Include(p => p.User)
                    .FirstOrDefaultAsync(p => p.UserId == userId.Value);
            }
            else if (!string.IsNullOrWhiteSpace(phone))
            {
                profile = await _context.PassengerProfiles
                    .Include(p => p.User)
                    .FirstOrDefaultAsync(p => p.Phone == phone);
            }
            else if (!string.IsNullOrWhiteSpace(name))
            {
                profile = await _context.PassengerProfiles
                    .Include(p => p.User)
                    .FirstOrDefaultAsync(p => p.Name.ToLower() == name.ToLower());
            }

            // Build summary
            var totalTrips = allTrips.Count;
            var totalSpent = allTrips.Sum(t => t.Amount);
            var cashTotal = allTrips.Where(t => (t.PaymentMethod ?? "Cash") == "Cash").Sum(t => t.Amount);
            var cardTotal = allTrips.Where(t => (t.PaymentMethod ?? "Cash") == "Card").Sum(t => t.Amount);
            var firstTrip = allTrips.LastOrDefault()?.BoardedAt;
            var lastTrip = allTrips.FirstOrDefault()?.BoardedAt;

            // Top routes
            var topRoutes = allTrips
                .GroupBy(t => new { t.DepartureStation, t.ArrivalStation })
                .Select(g => new
                {
                    Route = $"{g.Key.DepartureStation} → {g.Key.ArrivalStation}",
                    Count = g.Count(),
                    TotalSpent = g.Sum(t => t.Amount)
                })
                .OrderByDescending(r => r.Count)
                .Take(5)
                .ToList();

            // Trip list
            var trips = allTrips.Select(tp => new
            {
                tp.Id,
                tp.TaxiRankTripId,
                tp.PassengerName,
                tp.PassengerPhone,
                tp.NextOfKinName,
                tp.NextOfKinContact,
                tp.DepartureStation,
                tp.ArrivalStation,
                tp.Amount,
                tp.PaymentMethod,
                tp.PaymentReference,
                tp.SeatNumber,
                tp.BoardedAt,
                tp.Notes,
                TripStatus = tp.TaxiRankTrip != null ? tp.TaxiRankTrip.Status : null,
                TripDepartureTime = tp.TaxiRankTrip != null ? (DateTime?)tp.TaxiRankTrip.DepartureTime : null,
                TripArrivalTime = tp.TaxiRankTrip != null ? tp.TaxiRankTrip.ArrivalTime : null
            }).ToList();

            return Ok(new
            {
                // Profile info
                Profile = profile != null ? new
                {
                    profile.Id,
                    profile.UserId,
                    profile.Name,
                    profile.Phone,
                    profile.Email,
                    IsRegistered = true
                } : null,
                // Summary stats
                Summary = new
                {
                    TotalTrips = totalTrips,
                    TotalSpent = totalSpent,
                    CashTotal = cashTotal,
                    CardTotal = cardTotal,
                    FirstTrip = firstTrip,
                    LastTrip = lastTrip,
                    TopRoutes = topRoutes
                },
                // All trips
                Trips = trips
            });
        }

        // GET: api/Passengers/trip/{id} - full details of a specific trip record (Live Queue or Book Seat)
        [HttpGet("trip/{id:guid}")]
        public async Task<ActionResult> GetTripDetail(Guid id)
        {
            // First try to find as TripPassenger (Live Queue)
            var tp = await _context.TripPassengers
                .Include(x => x.TaxiRankTrip)
                    .ThenInclude(t => t.Vehicle)
                .Include(x => x.TaxiRankTrip)
                    .ThenInclude(t => t.Driver)
                .Include(x => x.TaxiRankTrip)
                    .ThenInclude(t => t.Marshal)
                .Include(x => x.TaxiRankTrip)
                    .ThenInclude(t => t.TaxiRank)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (tp != null)
            {
                // Return Live Queue trip details
                var trip = tp.TaxiRankTrip;

                // Get other passengers on the same trip
                var otherPassengers = trip != null
                    ? await _context.TripPassengers
                        .Where(p => p.TaxiRankTripId == trip.Id && p.Id != id)
                        .Select(p => new
                        {
                            p.Id,
                            Name = p.PassengerName ?? "Unknown",
                            Phone = p.PassengerPhone ?? "",
                            p.SeatNumber,
                            p.Amount,
                            p.PaymentMethod,
                            p.BoardedAt
                        })
                        .ToListAsync()
                    : null;

                var totalPassengers = (otherPassengers?.Count ?? 0) + 1;

                // Check if this passenger is a registered user
                PassengerProfile passengerProfile = null;
                if (tp.UserId != Guid.Empty)
                {
                    passengerProfile = await _context.PassengerProfiles
                        .FirstOrDefaultAsync(p => p.UserId == tp.UserId);
                }
                if (passengerProfile == null && !string.IsNullOrWhiteSpace(tp.PassengerPhone))
                {
                    passengerProfile = await _context.PassengerProfiles
                        .FirstOrDefaultAsync(p => p.Phone == tp.PassengerPhone);
                }

                var result = new
                {
                    Type = "LiveQueue",
                    Passenger = new
                    {
                        tp.Id,
                        tp.PassengerName,
                        tp.PassengerPhone,
                        tp.DepartureStation,
                        tp.ArrivalStation,
                        tp.Amount,
                        tp.PaymentMethod,
                        tp.SeatNumber,
                        tp.BoardedAt,
                        CreatedAt = tp.BoardedAt,
                        UserId = tp.UserId,
                        IsRegisteredUser = passengerProfile != null
                    },
                    Trip = trip != null ? new
                    {
                        trip.Id,
                        trip.DepartureTime,
                        trip.ArrivalTime,
                        trip.Status,
                        trip.PassengerCount,
                        trip.TotalAmount,
                        trip.Notes,
                        Vehicle = trip.Vehicle != null ? new
                        {
                            trip.Vehicle.Make,
                            trip.Vehicle.Model,
                            trip.Vehicle.Registration,
                            Driver = trip.Driver != null ? new
                            {
                                trip.Driver.Name,
                                trip.Driver.Phone
                            } : null
                        } : null,
                        TaxiRank = trip.TaxiRank != null ? new
                        {
                            trip.TaxiRank.Name,
                            trip.TaxiRank.Address,
                            trip.TaxiRank.City
                        } : null
                    } : null,
                    OtherPassengers = otherPassengers,
                    TotalPassengers = totalPassengers
                };

                return Ok(result);
            }

            // If not found as TripPassenger, try ScheduledTripBooking (Book Seat)
            var stb = await _context.ScheduledTripBookings
                .Include(x => x.TaxiRank)
                .Include(x => x.Route)
                .Include(x => x.Passengers)
                .Include(x => x.ScheduledTrip)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (stb != null)
            {
                // Return Book Seat trip details
                var otherPassengers = stb.Passengers
                    .Where(p => p.Id != stb.Passengers.FirstOrDefault()?.Id)
                    .Select(p => new
                    {
                        p.Id,
                        Name = p.Name,
                        Phone = p.ContactNumber,
                        SeatNumber = (int?)null,
                        Amount = (decimal?)null,
                        PaymentMethod = (string?)null,
                        BoardedAt = (DateTime?)null
                    })
                    .ToList();

                var totalPassengers = stb.Passengers.Count;

                var result = new
                {
                    Type = "BookSeat",
                    Passenger = new
                    {
                        stb.Id,
                        PassengerName = stb.Passengers.FirstOrDefault()?.Name ?? "Unknown",
                        PassengerPhone = stb.Passengers.FirstOrDefault()?.ContactNumber ?? "",
                        DepartureStation = stb.Route?.DepartureStation ?? "",
                        ArrivalStation = stb.Route?.DestinationStation ?? "",
                        Amount = stb.TotalFare,
                        PaymentMethod = "Pending",
                        SeatNumber = stb.SeatNumbers.Any() ? string.Join(", ", stb.SeatNumbers) : "",
                        BoardedAt = (DateTime?)null,
                        CreatedAt = stb.CreatedAt,
                        UserId = stb.UserId,
                        IsRegisteredUser = true // Book Seat trips always have a user
                    },
                    Trip = new
                    {
                        stb.Id,
                        DepartureTime = stb.TravelDate,
                        ArrivalTime = (DateTime?)null,
                        Status = "Booked",
                        PassengerCount = stb.SeatsBooked,
                        TotalAmount = stb.TotalFare,
                        Notes = (string?)null,
                        Vehicle = (object)null,
                        TaxiRank = stb.TaxiRank != null ? new
                        {
                            stb.TaxiRank.Name,
                            stb.TaxiRank.Address,
                            stb.TaxiRank.City
                        } : null,
                        Route = stb.Route != null ? new
                        {
                            stb.Route.RouteName,
                            stb.Route.DepartureStation,
                            stb.Route.DestinationStation,
                            stb.Route.DepartureTime,
                            stb.Route.StandardFare
                        } : null
                    },
                    OtherPassengers = otherPassengers,
                    TotalPassengers = totalPassengers
                };

                return Ok(result);
            }

            return NotFound(new { message = "Trip not found" });
        }

        // POST: api/Passengers/trip/{id}/review - works for both Live Queue and Book Seat trips
        [HttpPost("trip/{id:guid}/review")]
        public async Task<ActionResult> SubmitReview(Guid id, [FromBody] CreateReviewDto dto)
        {
            // First try to find as TripPassenger (Live Queue)
            var tp = await _context.TripPassengers
                .Include(x => x.TaxiRankTrip)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (tp != null)
            {
                // Check if a review already exists
                var existing = await _context.Reviews
                    .FirstOrDefaultAsync(r => r.TargetId == id && r.TargetType == "TripPassenger");
                if (existing != null)
                    return BadRequest(new { message = "A review has already been submitted for this trip" });

            var review = new Review
            {
                Id = Guid.NewGuid(),
                ReviewerId = tp.UserId,
                TargetId = id,
                TargetType = "TripPassenger",
                Rating = Math.Clamp(dto.Rating, 1, 5),
                Comments = dto.Comments ?? "",
                CreatedAt = DateTime.UtcNow
            };

            _context.Reviews.Add(review);

            // Also create a DriverBehaviorEvent to affect the driver's performance score
            var trip = await _context.TaxiRankTrips.FirstOrDefaultAsync(t => t.Id == tp.TaxiRankTripId);
            if (trip?.DriverId != null && trip.DriverId != Guid.Empty)
            {
                var clampedRating = Math.Clamp(dto.Rating, 1, 5);
                string category, eventType, severity;
                int points;

                if (clampedRating >= 4)
                {
                    category = "Compliment";
                    eventType = "Positive";
                    severity = "Low";
                    points = clampedRating == 5 ? 5 : 3;
                }
                else if (clampedRating <= 2)
                {
                    category = "PassengerComplaint";
                    eventType = "Negative";
                    severity = clampedRating == 1 ? "High" : "Medium";
                    points = clampedRating == 1 ? -8 : -5;
                }
                else
                {
                    category = "PassengerRating";
                    eventType = "Neutral";
                    severity = "Low";
                    points = 0;
                }

                var behaviorEvent = new DriverBehaviorEvent
                {
                    Id = Guid.NewGuid(),
                    DriverId = trip.DriverId.Value,
                    VehicleId = trip.VehicleId,
                    ReportedById = tp.UserId != Guid.Empty ? tp.UserId : (Guid?)null,
                    TenantId = trip.TenantId,
                    Category = category,
                    Severity = severity,
                    Description = $"Passenger rating: {clampedRating}/5" + (string.IsNullOrWhiteSpace(dto.Comments) ? "" : $" - {dto.Comments}"),
                    Location = $"{tp.DepartureStation} → {tp.ArrivalStation}",
                    PointsImpact = points,
                    EventType = eventType,
                    EventDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    Notes = $"TripPassengerId: {id}, ReviewId: {review.Id}",
                    IsResolved = true,
                    ResolvedAt = DateTime.UtcNow,
                    Resolution = "Auto-resolved: Passenger review"
                };
                _context.DriverBehaviorEvents.Add(behaviorEvent);
            }

            await _context.SaveChangesAsync();
                return Ok(new { message = "Review submitted successfully", reviewId = review.Id });
            }

            // If not found as TripPassenger, try ScheduledTripBooking (Book Seat)
            var stb = await _context.ScheduledTripBookings.FindAsync(id);
            if (stb != null)
            {
                // Check if a review already exists
                var existing = await _context.Reviews
                    .FirstOrDefaultAsync(r => r.TargetId == id && r.TargetType == "ScheduledTripBooking");
                if (existing != null)
                    return BadRequest(new { message = "A review has already been submitted for this trip" });

                var review = new Review
                {
                    Id = Guid.NewGuid(),
                    ReviewerId = stb.UserId,
                    TargetId = id,
                    TargetType = "ScheduledTripBooking",
                    Rating = Math.Clamp(dto.Rating, 1, 5),
                    Comments = dto.Comments ?? "",
                    CreatedAt = DateTime.UtcNow
                };

                _context.Reviews.Add(review);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Review submitted successfully", reviewId = review.Id });
            }

            return NotFound(new { message = "Trip not found" });
        }

        // GET: api/Passengers/my-trips
        [HttpGet("my-trips")]
        public async Task<ActionResult> GetMyTrips([FromQuery] int limit = 50)
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(userId) || !Guid.TryParse(userId, out var userGuid))
                return Unauthorized(new { message = "User not authenticated" });

            // Get Live Queue trips
            var liveQueueTrips = await _context.TripPassengers
                .Include(tp => tp.TaxiRankTrip)
                    .ThenInclude(t => t!.Vehicle)
                .Include(tp => tp.TaxiRankTrip)
                    .ThenInclude(t => t!.TaxiRank)
                .Include(tp => tp.TaxiRankTrip)
                    .ThenInclude(t => t!.Driver)
                .Where(tp => tp.UserId == userGuid)
                .OrderByDescending(tp => tp.BoardedAt)
                .Select(tp => new
                {
                    Id = tp.Id,
                    Type = "LiveQueue",
                    tp.PassengerName,
                    tp.PassengerPhone,
                    DepartureStation = tp.DepartureStation,
                    ArrivalStation = tp.ArrivalStation,
                    Amount = tp.Amount,
                    PaymentMethod = tp.PaymentMethod,
                    SeatNumber = tp.SeatNumber.HasValue ? tp.SeatNumber.Value.ToString() : "",
                    BoardedAt = (DateTime?)tp.BoardedAt,
                    CreatedAt = tp.BoardedAt,
                    TripStatus = tp.TaxiRankTrip != null ? tp.TaxiRankTrip.Status : null,
                    Vehicle = tp.TaxiRankTrip != null ? (object)new
                    {
                        tp.TaxiRankTrip.Vehicle!.Make,
                        tp.TaxiRankTrip.Vehicle.Model,
                        tp.TaxiRankTrip.Vehicle.Registration,
                        DriverName = tp.TaxiRankTrip.Driver != null ? tp.TaxiRankTrip.Driver.Name : "",
                        DriverPhone = tp.TaxiRankTrip.Driver != null ? tp.TaxiRankTrip.Driver.Phone : ""
                    } : null,
                    TaxiRank = tp.TaxiRankTrip != null ? new
                    {
                        tp.TaxiRankTrip.TaxiRank.Name,
                        tp.TaxiRankTrip.TaxiRank.Address,
                        tp.TaxiRankTrip.TaxiRank.City
                    } : null
                })
                .ToListAsync();

            // Get Book Seat trips (ScheduledTripBookings)
            var bookedTrips = await _context.ScheduledTripBookings
                .Include(stb => stb.TaxiRank)
                .Include(stb => stb.Route)
                .Include(stb => stb.Passengers)
                .Where(stb => stb.UserId == userGuid)
                .OrderByDescending(stb => stb.CreatedAt)
                .Select(stb => new
                {
                    Id = stb.Id,
                    Type = "BookSeat",
                    PassengerName = stb.Passengers.FirstOrDefault() != null ? stb.Passengers.FirstOrDefault().Name : "Unknown",
                    PassengerPhone = stb.Passengers.FirstOrDefault() != null ? stb.Passengers.FirstOrDefault().ContactNumber : "",
                    DepartureStation = stb.Route != null ? stb.Route.DepartureStation : "",
                    ArrivalStation = stb.Route != null ? stb.Route.DestinationStation : "",
                    Amount = stb.TotalFare,
                    PaymentMethod = "Pending",
                    SeatNumber = stb.SeatNumbers.Any() ? string.Join(", ", stb.SeatNumbers) : "",
                    BoardedAt = (DateTime?)null,
                    CreatedAt = stb.CreatedAt,
                    TripStatus = "Booked",
                    Vehicle = (object)null,
                    TaxiRank = stb.TaxiRank != null ? new
                    {
                        stb.TaxiRank.Name,
                        stb.TaxiRank.Address,
                        stb.TaxiRank.City
                    } : null
                })
                .ToListAsync();

            // Combine and order by creation date
            var allTrips = liveQueueTrips.Concat(bookedTrips)
                .OrderByDescending(t => t.CreatedAt)
                .Take(limit)
                .ToList();

            return Ok(allTrips);
        }

        // GET: api/Passengers/recent?taxiRankId=xxx&limit=50
        [HttpGet("recent")]
        public async Task<ActionResult> GetRecentPassengers([FromQuery] Guid? taxiRankId = null, [FromQuery] int limit = 20)
        {
            var query = _context.TripPassengers
                .Include(tp => tp.TaxiRankTrip)
                .AsQueryable();

            if (taxiRankId.HasValue)
            {
                query = query.Where(tp => tp.TaxiRankTrip != null && tp.TaxiRankTrip.TaxiRankId == taxiRankId.Value);
            }

            var recentPassengers = await query
                .OrderByDescending(tp => tp.BoardedAt)
                .Take(limit)
                .Select(tp => new
                {
                    tp.Id,
                    tp.UserId,
                    Name = tp.PassengerName ?? "Unknown",
                    Phone = tp.PassengerPhone ?? "",
                    tp.DepartureStation,
                    tp.ArrivalStation,
                    tp.Amount,
                    tp.PaymentMethod,
                    tp.SeatNumber,
                    tp.BoardedAt,
                    TripStatus = tp.TaxiRankTrip != null ? tp.TaxiRankTrip.Status : null
                })
                .ToListAsync();

            return Ok(recentPassengers);
        }

        // POST: api/Passengers/trip/{id}/incident - works for both Live Queue and Book Seat trips
        [HttpPost("trip/{id:guid}/incident")]
        public async Task<ActionResult> ReportIncident(Guid id, [FromBody] CreateIncidentDto dto)
        {
            // First try to find as TripPassenger (Live Queue)
            var tp = await _context.TripPassengers
                .Include(x => x.TaxiRankTrip)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (tp != null)
            {
                var trip = tp.TaxiRankTrip;

                var incident = new Incident
                {
                    Id = Guid.NewGuid(),
                    TaxiRankId = trip?.TaxiRankId,
                    TaxiRankTripId = trip?.Id,
                    TripPassengerId = id,
                    ReportedByUserId = tp.UserId != Guid.Empty ? tp.UserId : (Guid?)null,
                    TenantId = trip?.TenantId,
                    ReporterName = tp.PassengerName ?? "Unknown",
                    ReporterPhone = tp.PassengerPhone,
                    Category = dto.Category ?? "Other",
                    Severity = dto.Severity ?? "Medium",
                    Description = dto.Description ?? "",
                    Location = dto.Location ?? (trip != null ? $"{tp.DepartureStation} → {tp.ArrivalStation}" : null),
                    Status = "Open",
                    CreatedAt = DateTime.UtcNow
                };

                _context.Incidents.Add(incident);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    incident.Id,
                    incident.Category,
                    incident.Severity,
                    incident.Description,
                    incident.Status,
                    incident.CreatedAt
                });
            }

            // If not found as TripPassenger, try ScheduledTripBooking (Book Seat)
            var stb = await _context.ScheduledTripBookings
                .Include(x => x.TaxiRank)
                .Include(x => x.Route)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (stb != null)
            {
                var incident = new Incident
                {
                    Id = Guid.NewGuid(),
                    TaxiRankId = stb.TaxiRankId,
                    TaxiRankTripId = null,
                    TripPassengerId = id, // Use TripPassengerId to store the booking ID
                    ReportedByUserId = stb.UserId,
                    TenantId = null, // ScheduledTripBooking doesn't have TenantId
                    ReporterName = stb.Passengers.FirstOrDefault()?.Name ?? "Unknown",
                    ReporterPhone = stb.Passengers.FirstOrDefault()?.ContactNumber ?? "",
                    Category = dto.Category ?? "Other",
                    Severity = dto.Severity ?? "Medium",
                    Description = dto.Description ?? "",
                    Location = dto.Location ?? (stb.Route != null ? $"{stb.Route.DepartureStation} → {stb.Route.DestinationStation}" : null),
                    Status = "Open",
                    CreatedAt = DateTime.UtcNow
                };

                _context.Incidents.Add(incident);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    incident.Id,
                    incident.Category,
                    incident.Severity,
                    incident.Description,
                    incident.Status,
                    incident.CreatedAt
                });
            }

            return NotFound(new { message = "Trip not found" });
        }

        // GET: api/Passengers/incidents?taxiRankId=xxx&status=Open&limit=50
        [HttpGet("incidents")]
        public async Task<ActionResult> GetIncidents([FromQuery] Guid? taxiRankId = null, [FromQuery] string? status = null, [FromQuery] int limit = 50)
        {
            var query = _context.Incidents.AsQueryable();

            if (taxiRankId.HasValue)
                query = query.Where(i => i.TaxiRankId == taxiRankId.Value);
            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(i => i.Status == status);

            var incidents = await query
                .OrderByDescending(i => i.CreatedAt)
                .Take(limit)
                .Select(i => new
                {
                    i.Id,
                    i.TaxiRankId,
                    i.TaxiRankTripId,
                    i.TripPassengerId,
                    i.ReporterName,
                    i.ReporterPhone,
                    i.Category,
                    i.Severity,
                    i.Description,
                    i.Location,
                    i.Status,
                    i.Resolution,
                    i.CreatedAt,
                    i.ResolvedAt
                })
                .ToListAsync();

            return Ok(incidents);
        }

        // PUT: api/Passengers/incidents/{id}/resolve
        [HttpPut("incidents/{id:guid}/resolve")]
        public async Task<ActionResult> ResolveIncident(Guid id, [FromBody] ResolveIncidentDto dto)
        {
            var incident = await _context.Incidents.FindAsync(id);
            if (incident == null)
                return NotFound(new { message = "Incident not found" });

            incident.Status = dto.Status ?? "Resolved";
            incident.Resolution = dto.Resolution;
            incident.ResolvedByUserId = dto.ResolvedByUserId;
            incident.ResolvedAt = DateTime.UtcNow;
            incident.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                incident.Id,
                incident.Status,
                incident.Resolution,
                incident.ResolvedAt
            });
        }
    }

    public class CreateReviewDto
    {
        public int Rating { get; set; }
        public string? Comments { get; set; }
    }

    public class CreateIncidentDto
    {
        public string? Category { get; set; }
        public string? Severity { get; set; }
        public string? Description { get; set; }
        public string? Location { get; set; }
    }

    public class ResolveIncidentDto
    {
        public string? Status { get; set; }
        public string? Resolution { get; set; }
        public Guid? ResolvedByUserId { get; set; }
    }
}
