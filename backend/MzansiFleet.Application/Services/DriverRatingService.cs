using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Repository;

namespace MzansiFleet.Application.Services
{
    public interface IDriverRatingService
    {
        Task UpdateDriverRatingAsync(Guid driverId);
        Task UpdateDriverRatingFromReviewAsync(Guid driverId, int rating);
        Task<DriverRatingStats> GetDriverRatingStatsAsync(Guid driverId);
        Task<IEnumerable<DriverRatingLeaderboard>> GetDriverLeaderboardAsync(Guid? taxiRankId = null, int limit = 50);
    }

    public class DriverRatingStats
    {
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public int TotalTrips { get; set; }
        public int? RankPosition { get; set; }
        public int TotalDrivers { get; set; }
        public DateTime? LastRatingUpdate { get; set; }
    }

    public class DriverRatingLeaderboard
    {
        public Guid DriverId { get; set; }
        public string DriverName { get; set; }
        public string VehicleRegistration { get; set; }
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public int TotalTrips { get; set; }
        public int Rank { get; set; }
        public string TaxiRankName { get; set; }
    }

    public class DriverRatingService : IDriverRatingService
    {
        private readonly MzansiFleetDbContext _context;

        public DriverRatingService(MzansiFleetDbContext context)
        {
            _context = context;
        }

        public async Task UpdateDriverRatingAsync(Guid driverId)
        {
            var driver = await _context.DriverProfiles
                .Include(d => d.User)
                .FirstOrDefaultAsync(d => d.Id == driverId);

            if (driver == null) return;

            // Get all reviews for trips with this driver
            var driverReviews = await (
                from r in _context.Reviews
                join tp in _context.TripPassengers on r.TargetId equals tp.Id
                join trip in _context.TaxiRankTrips on tp.TaxiRankTripId equals trip.Id
                where trip.DriverId == driverId && r.TargetType == "TripPassenger"
                select r.Rating
            ).ToListAsync();

            // Get total trips for this driver
            var totalTrips = await _context.TaxiRankTrips
                .Where(t => t.DriverId == driverId && t.Status == "Completed")
                .CountAsync();

            // Update driver rating
            driver.AverageRating = driverReviews.Any() ? driverReviews.Average() : (double?)null;
            driver.TotalReviews = driverReviews.Count;
            driver.TotalTrips = totalTrips;
            driver.LastRatingUpdate = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        public async Task UpdateDriverRatingFromReviewAsync(Guid driverId, int rating)
        {
            var driver = await _context.DriverProfiles
                .FirstOrDefaultAsync(d => d.Id == driverId);

            if (driver == null) return;

            // Get current stats
            var currentReviews = driver.TotalReviews ?? 0;
            var currentAverage = driver.AverageRating ?? 0;

            // Calculate new average
            var newTotalReviews = currentReviews + 1;
            var newAverage = ((currentAverage * currentReviews) + rating) / newTotalReviews;

            // Update driver
            driver.AverageRating = newAverage;
            driver.TotalReviews = newTotalReviews;
            driver.LastRatingUpdate = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        public async Task<DriverRatingStats> GetDriverRatingStatsAsync(Guid driverId)
        {
            var driver = await _context.DriverProfiles
                .FirstOrDefaultAsync(d => d.Id == driverId);

            if (driver == null)
            {
                return new DriverRatingStats();
            }

            // Get rank position
            var allDrivers = await _context.DriverProfiles
                .Where(d => d.AverageRating.HasValue)
                .OrderByDescending(d => d.AverageRating)
                .ThenByDescending(d => d.TotalReviews)
                .ToListAsync();

            var rank = allDrivers.FindIndex(d => d.Id == driverId) + 1;

            return new DriverRatingStats
            {
                AverageRating = driver.AverageRating ?? 0,
                TotalReviews = driver.TotalReviews ?? 0,
                TotalTrips = driver.TotalTrips ?? 0,
                RankPosition = rank > 0 ? rank : null,
                TotalDrivers = allDrivers.Count,
                LastRatingUpdate = driver.LastRatingUpdate
            };
        }

        public async Task<IEnumerable<DriverRatingLeaderboard>> GetDriverLeaderboardAsync(Guid? taxiRankId = null, int limit = 50)
        {
            var query = _context.DriverProfiles
                .Include(d => d.User)
                .Where(d => d.AverageRating.HasValue && d.IsActive);

            if (taxiRankId.HasValue)
            {
                query = query.Where(d => _context.TaxiRankTrips
                    .Any(t => t.DriverId == d.Id && t.TaxiRankId == taxiRankId.Value));
            }

            var drivers = await query
                .OrderByDescending(d => d.AverageRating)
                .ThenByDescending(d => d.TotalReviews)
                .Take(limit)
                .ToListAsync();

            var leaderboard = new List<DriverRatingLeaderboard>();
            var rank = 1;

            foreach (var driver in drivers)
            {
                // Get current vehicle assignment
                var currentTrip = await _context.TaxiRankTrips
                    .Include(t => t.Vehicle)
                    .Include(t => t.TaxiRank)
                    .Where(t => t.DriverId == driver.Id && t.Status != "Completed")
                    .FirstOrDefaultAsync();

                var taxiRank = currentTrip?.TaxiRank ?? 
                    await _context.TaxiRankTrips
                        .Include(t => t.TaxiRank)
                        .Where(t => t.DriverId == driver.Id)
                        .OrderByDescending(t => t.CreatedAt)
                        .Select(t => t.TaxiRank)
                        .FirstOrDefaultAsync();

                leaderboard.Add(new DriverRatingLeaderboard
                {
                    DriverId = driver.Id,
                    DriverName = driver.Name ?? driver.User?.FullName ?? "Unknown",
                    VehicleRegistration = currentTrip?.Vehicle?.Registration ?? "Unassigned",
                    AverageRating = driver.AverageRating ?? 0,
                    TotalReviews = driver.TotalReviews ?? 0,
                    TotalTrips = driver.TotalTrips ?? 0,
                    Rank = rank++,
                    TaxiRankName = taxiRank?.Name ?? "Unknown"
                });
            }

            return leaderboard;
        }
    }
}
