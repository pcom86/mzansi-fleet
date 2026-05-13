using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MzansiFleet.Application.Services;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

#nullable disable

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DriverRatingController : ControllerBase
    {
        private readonly IDriverRatingService _driverRatingService;

        public DriverRatingController(IDriverRatingService driverRatingService)
        {
            _driverRatingService = driverRatingService;
        }

        // GET: api/DriverRating/stats/{driverId}
        [HttpGet("stats/{driverId:guid}")]
        public async Task<ActionResult> GetDriverStats(Guid driverId)
        {
            try
            {
                var stats = await _driverRatingService.GetDriverRatingStatsAsync(driverId);
                return Ok(stats);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to get driver stats", error = ex.Message });
            }
        }

        // GET: api/DriverRating/leaderboard
        [HttpGet("leaderboard")]
        public async Task<ActionResult> GetLeaderboard([FromQuery] Guid? taxiRankId = null, [FromQuery] int limit = 50)
        {
            try
            {
                var leaderboard = await _driverRatingService.GetDriverLeaderboardAsync(taxiRankId, limit);
                return Ok(leaderboard);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to get leaderboard", error = ex.Message });
            }
        }

        // POST: api/DriverRating/update/{driverId}
        [HttpPost("update/{driverId:guid}")]
        public async Task<ActionResult> UpdateDriverRating(Guid driverId)
        {
            try
            {
                await _driverRatingService.UpdateDriverRatingAsync(driverId);
                return Ok(new { message = "Driver rating updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to update driver rating", error = ex.Message });
            }
        }

        // GET: api/DriverRating/rank/{driverId}
        [HttpGet("rank/{driverId:guid}")]
        public async Task<ActionResult> GetDriverRank(Guid driverId)
        {
            try
            {
                var stats = await _driverRatingService.GetDriverRatingStatsAsync(driverId);
                return Ok(new { 
                    rank = stats.RankPosition,
                    totalDrivers = stats.TotalDrivers,
                    percentile = stats.TotalDrivers > 0 ? (double)(stats.TotalDrivers - stats.RankPosition + 1) / stats.TotalDrivers * 100 : 0
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to get driver rank", error = ex.Message });
            }
        }
    }
}
