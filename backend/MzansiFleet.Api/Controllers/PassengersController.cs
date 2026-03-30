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

        // GET: api/Passengers/trip/{tripPassengerId} - full details of a specific trip record
        [HttpGet("trip/{tripPassengerId:guid}")]
        public async Task<ActionResult> GetTripDetail(Guid tripPassengerId)
        {
            var tp = await _context.TripPassengers
                .Include(x => x.TaxiRankTrip)
                    .ThenInclude(t => t.Vehicle)
                .Include(x => x.TaxiRankTrip)
                    .ThenInclude(t => t.Driver)
                .Include(x => x.TaxiRankTrip)
                    .ThenInclude(t => t.Marshal)
                .Include(x => x.TaxiRankTrip)
                    .ThenInclude(t => t.TaxiRank)
                .FirstOrDefaultAsync(x => x.Id == tripPassengerId);

            if (tp == null)
                return NotFound(new { message = "Trip passenger record not found" });

            var trip = tp.TaxiRankTrip;

            // Get other passengers on the same trip
            var otherPassengers = trip != null
                ? await _context.TripPassengers
                    .Where(p => p.TaxiRankTripId == trip.Id && p.Id != tripPassengerId)
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

            // Fetch review for this trip passenger record
            var review = await _context.Reviews
                .Where(r => r.TargetId == tripPassengerId && r.TargetType == "TripPassenger")
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync();

            return Ok(new
            {
                // This passenger's booking details
                Passenger = new
                {
                    tp.Id,
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
                    tp.UserId,
                    IsRegistered = passengerProfile != null
                },
                // The trip details
                Trip = trip != null ? new
                {
                    trip.Id,
                    trip.DepartureStation,
                    trip.DestinationStation,
                    trip.DepartureTime,
                    trip.ArrivalTime,
                    trip.Status,
                    trip.TotalAmount,
                    trip.Notes,
                    trip.CreatedAt,
                    trip.Latitude,
                    trip.Longitude,
                    TotalPassengers = totalPassengers,
                    VehicleRegistration = trip.Vehicle?.Registration,
                    VehicleMake = trip.Vehicle != null ? $"{trip.Vehicle.Make} {trip.Vehicle.Model}" : null,
                    DriverName = trip.Driver?.Name,
                    DriverPhone = trip.Driver?.Phone,
                    MarshalName = trip.Marshal?.FullName,
                    TaxiRankName = trip.TaxiRank?.Name,
                    TaxiRankAddress = trip.TaxiRank?.Address,
                    TaxiRankCity = trip.TaxiRank?.City,
                    TaxiRankLatitude = trip.TaxiRank?.Latitude,
                    TaxiRankLongitude = trip.TaxiRank?.Longitude
                } : null,
                // Other passengers on the same trip
                OtherPassengers = otherPassengers,
                // Review if exists
                Review = review != null ? new
                {
                    review.Id,
                    review.Rating,
                    review.Comments,
                    review.CreatedAt
                } : null
            });
        }

        // POST: api/Passengers/trip/{tripPassengerId}/review
        [HttpPost("trip/{tripPassengerId:guid}/review")]
        public async Task<ActionResult> SubmitReview(Guid tripPassengerId, [FromBody] CreateReviewDto dto)
        {
            var tp = await _context.TripPassengers.FindAsync(tripPassengerId);
            if (tp == null)
                return NotFound(new { message = "Trip passenger record not found" });

            // Check if a review already exists
            var existing = await _context.Reviews
                .FirstOrDefaultAsync(r => r.TargetId == tripPassengerId && r.TargetType == "TripPassenger");
            if (existing != null)
                return BadRequest(new { message = "A review has already been submitted for this trip" });

            var review = new Review
            {
                Id = Guid.NewGuid(),
                ReviewerId = tp.UserId,
                TargetId = tripPassengerId,
                TargetType = "TripPassenger",
                Rating = Math.Clamp(dto.Rating, 1, 5),
                Comments = dto.Comments ?? "",
                CreatedAt = DateTime.UtcNow
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                review.Id,
                review.Rating,
                review.Comments,
                review.CreatedAt
            });
        }

        // GET: api/Passengers/recent?taxiRankId=xxx&limit=20
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
    }

    public class CreateReviewDto
    {
        public int Rating { get; set; }
        public string? Comments { get; set; }
    }
}
