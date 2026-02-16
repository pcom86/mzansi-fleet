using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MzansiFleet.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ServiceProviderDashboardController : ControllerBase
    {
        private readonly MzansiFleetDbContext _context;

        public ServiceProviderDashboardController(MzansiFleetDbContext context)
        {
            _context = context;
        }

        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetDashboardDataByUserId(string userId)
        {
            try
            {
                if (!Guid.TryParse(userId, out Guid parsedUserId))
                {
                    return BadRequest("Invalid user ID format");
                }

                // Get the service provider profile to get the business name
                var profile = await _context.ServiceProviderProfiles
                    .FirstOrDefaultAsync(sp => sp.UserId == parsedUserId);

                if (profile == null || string.IsNullOrEmpty(profile.BusinessName))
                {
                    Console.WriteLine($"ServiceProviderDashboard - No profile found for user: {parsedUserId}");
                    return Ok(new
                    {
                        upcomingAppointments = new { count = 0, appointments = new List<object>() },
                        pendingJobs = new { count = 0 },
                        recentMaintenance = new { count = 0, records = new List<object>() },
                        reviews = new { count = 0, averageRating = 0.0, items = new List<object>() },
                        financial = new
                        {
                            totalRevenue = 0,
                            last30DaysRevenue = 0,
                            last60DaysRevenue = 0,
                            revenueGrowth = 0,
                            totalJobsCompleted = 0,
                            averageJobValue = 0,
                            monthlyRevenue = new List<object>()
                        }
                    });
                }

                var serviceProviderName = profile.BusinessName;
                Console.WriteLine($"ServiceProviderDashboard - Received request for user: {parsedUserId}, business: {serviceProviderName}");
                
                // Get upcoming scheduled appointments
                var upcomingAppointments = await _context.MechanicalRequests
                    .Where(mr => mr.ServiceProvider == serviceProviderName 
                        && mr.State == "Scheduled" 
                        && mr.ScheduledDate.HasValue 
                        && mr.ScheduledDate.Value >= DateTime.UtcNow)
                    .OrderBy(mr => mr.ScheduledDate)
                    .Select(mr => new
                    {
                        id = mr.Id,
                        vehicleId = mr.VehicleId,
                        vehicleRegistration = _context.Vehicles
                            .Where(v => v.Id == mr.VehicleId)
                            .Select(v => v.Registration)
                            .FirstOrDefault(),
                        scheduledDate = mr.ScheduledDate,
                        category = mr.Category,
                        description = mr.Description,
                        location = mr.Location,
                        priority = mr.Priority,
                        scheduledBy = mr.ScheduledBy
                    })
                    .ToListAsync();

                Console.WriteLine($"Found {upcomingAppointments.Count} upcoming appointments");

                // Get pending jobs count
                var pendingJobsCount = await _context.MechanicalRequests
                    .Where(mr => mr.ServiceProvider == serviceProviderName 
                        && mr.State != "Completed")
                    .CountAsync();

                Console.WriteLine($"Found {pendingJobsCount} pending jobs");

                // Get recently completed maintenance
                var recentMaintenance = await _context.MaintenanceHistories
                    .Where(mh => mh.ServiceProvider == serviceProviderName 
                        && mh.Status == "Completed"
                        && mh.CompletedDate.HasValue)
                    .OrderByDescending(mh => mh.CompletedDate)
                    .Take(10)
                    .Select(mh => new
                    {
                        id = mh.Id,
                        vehicleId = mh.VehicleId,
                        vehicleRegistration = _context.Vehicles
                            .Where(v => v.Id == mh.VehicleId)
                            .Select(v => v.Registration)
                            .FirstOrDefault(),
                        maintenanceDate = mh.MaintenanceDate,
                        completedDate = mh.CompletedDate,
                        maintenanceType = mh.MaintenanceType,
                        component = mh.Component,
                        description = mh.Description,
                        cost = mh.Cost,
                        invoiceNumber = mh.InvoiceNumber,
                        mileageAtMaintenance = mh.MileageAtMaintenance,
                        rating = mh.ServiceProviderRating,
                        ownerName = _context.Vehicles
                            .Where(v => v.Id == mh.VehicleId)
                            .Join(_context.OwnerProfiles,
                                vehicle => vehicle.TenantId,
                                owner => owner.Id,
                                (vehicle, owner) => owner.ContactName)
                            .FirstOrDefault()
                    })
                    .ToListAsync();

                Console.WriteLine($"Found {recentMaintenance.Count} completed maintenance records");

                // Get financial summary
                var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
                var sixtyDaysAgo = DateTime.UtcNow.AddDays(-60);
                var ninetyDaysAgo = DateTime.UtcNow.AddDays(-90);

                var last30DaysRevenue = await _context.MaintenanceHistories
                    .Where(mh => mh.ServiceProvider == serviceProviderName 
                        && mh.Status == "Completed"
                        && mh.CompletedDate.HasValue
                        && mh.CompletedDate.Value >= thirtyDaysAgo)
                    .SumAsync(mh => mh.Cost);

                var last60DaysRevenue = await _context.MaintenanceHistories
                    .Where(mh => mh.ServiceProvider == serviceProviderName 
                        && mh.Status == "Completed"
                        && mh.CompletedDate.HasValue
                        && mh.CompletedDate.Value >= sixtyDaysAgo
                        && mh.CompletedDate.Value < thirtyDaysAgo)
                    .SumAsync(mh => mh.Cost);

                var totalRevenue = await _context.MaintenanceHistories
                    .Where(mh => mh.ServiceProvider == serviceProviderName 
                        && mh.Status == "Completed")
                    .SumAsync(mh => mh.Cost);

                var totalJobsCompleted = await _context.MaintenanceHistories
                    .Where(mh => mh.ServiceProvider == serviceProviderName 
                        && mh.Status == "Completed")
                    .CountAsync();

                var averageJobValue = totalJobsCompleted > 0 
                    ? totalRevenue / totalJobsCompleted 
                    : 0;

                // Monthly revenue breakdown for the last 6 months
                var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);
                var monthlyRevenue = await _context.MaintenanceHistories
                    .Where(mh => mh.ServiceProvider == serviceProviderName 
                        && mh.Status == "Completed"
                        && mh.CompletedDate.HasValue
                        && mh.CompletedDate.Value >= sixMonthsAgo)
                    .GroupBy(mh => new { 
                        Year = mh.CompletedDate.Value.Year, 
                        Month = mh.CompletedDate.Value.Month 
                    })
                    .Select(g => new
                    {
                        year = g.Key.Year,
                        month = g.Key.Month,
                        revenue = g.Sum(mh => mh.Cost),
                        jobCount = g.Count()
                    })
                    .OrderBy(x => x.year)
                    .ThenBy(x => x.month)
                    .ToListAsync();

                // Get reviews (completed maintenance with ratings)
                var reviews = await _context.MaintenanceHistories
                    .Where(mh => mh.ServiceProvider == serviceProviderName 
                        && mh.Status == "Completed"
                        && mh.ServiceProviderRating.HasValue
                        && mh.CompletedDate.HasValue)
                    .OrderByDescending(mh => mh.CompletedDate)
                    .Take(20)
                    .Select(mh => new
                    {
                        id = mh.Id,
                        vehicleRegistration = _context.Vehicles
                            .Where(v => v.Id == mh.VehicleId)
                            .Select(v => v.Registration)
                            .FirstOrDefault(),
                        rating = mh.ServiceProviderRating.Value,
                        comment = mh.Notes ?? "Service completed successfully.",
                        reviewDate = mh.CompletedDate.Value,
                        reviewerName = _context.Vehicles
                            .Where(v => v.Id == mh.VehicleId)
                            .Join(_context.OwnerProfiles,
                                vehicle => vehicle.TenantId,
                                owner => owner.Id,
                                (vehicle, owner) => owner.ContactName)
                            .FirstOrDefault() ?? "Vehicle Owner",
                        jobType = mh.MaintenanceType
                    })
                    .ToListAsync();

                // Calculate average rating
                var averageRating = reviews.Any() 
                    ? reviews.Average(r => r.rating) 
                    : 0.0;

                var dashboardData = new
                {
                    upcomingAppointments = new
                    {
                        count = upcomingAppointments.Count,
                        appointments = upcomingAppointments
                    },
                    pendingJobs = new
                    {
                        count = pendingJobsCount
                    },
                    recentMaintenance = new
                    {
                        count = recentMaintenance.Count,
                        records = recentMaintenance
                    },
                    reviews = new
                    {
                        count = reviews.Count,
                        averageRating = Math.Round(averageRating, 1),
                        items = reviews
                    },
                    financial = new
                    {
                        totalRevenue = totalRevenue,
                        last30DaysRevenue = last30DaysRevenue,
                        last60DaysRevenue = last60DaysRevenue,
                        revenueGrowth = last60DaysRevenue > 0 
                            ? ((last30DaysRevenue - last60DaysRevenue) / last60DaysRevenue * 100) 
                            : 0,
                        totalJobsCompleted = totalJobsCompleted,
                        averageJobValue = averageJobValue,
                        monthlyRevenue = monthlyRevenue
                    }
                };

                return Ok(dashboardData);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error loading dashboard data", error = ex.Message });
            }
        }

        [HttpGet("user/{userId}/appointments")]
        public async Task<IActionResult> GetAppointments(string userId, [FromQuery] string status = "all")
        {
            try
            {
                if (!Guid.TryParse(userId, out Guid parsedUserId))
                {
                    return BadRequest("Invalid user ID format");
                }

                // Get the service provider profile to get the business name
                var profile = await _context.ServiceProviderProfiles
                    .FirstOrDefaultAsync(sp => sp.UserId == parsedUserId);

                if (profile == null || string.IsNullOrEmpty(profile.BusinessName))
                {
                    return Ok(new List<object>());
                }

                var serviceProviderName = profile.BusinessName;

                var query = _context.MechanicalRequests
                    .Where(mr => mr.ServiceProvider == serviceProviderName);

                if (status.ToLower() == "scheduled")
                {
                    query = query.Where(mr => mr.State == "Scheduled" 
                        && mr.ScheduledDate.HasValue 
                        && mr.ScheduledDate.Value >= DateTime.UtcNow);
                }
                else if (status.ToLower() == "completed")
                {
                    query = query.Where(mr => mr.State == "Completed" && mr.CompletedDate.HasValue);
                }

                var appointments = await query
                    .OrderByDescending(mr => mr.ScheduledDate ?? mr.CreatedAt)
                    .Select(mr => new
                    {
                        id = mr.Id,
                        vehicleId = mr.VehicleId,
                        vehicleRegistration = _context.Vehicles
                            .Where(v => v.Id == mr.VehicleId)
                            .Select(v => v.Registration)
                            .FirstOrDefault(),
                        category = mr.Category,
                        description = mr.Description,
                        location = mr.Location,
                        scheduledDate = mr.ScheduledDate,
                        completedDate = mr.CompletedDate,
                        state = mr.State,
                        priority = mr.Priority
                    })
                    .ToListAsync();

                return Ok(appointments);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error loading appointments", error = ex.Message });
            }
        }

        [HttpGet("{serviceProviderName}/revenue-report")]
        public async Task<IActionResult> GetRevenueReport(
            string serviceProviderName, 
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var start = startDate ?? DateTime.UtcNow.AddMonths(-6);
                var end = endDate ?? DateTime.UtcNow;

                var revenueDetails = await _context.MaintenanceHistories
                    .Where(mh => mh.ServiceProvider == serviceProviderName 
                        && mh.Status == "Completed"
                        && mh.CompletedDate.HasValue
                        && mh.CompletedDate.Value >= start
                        && mh.CompletedDate.Value <= end)
                    .OrderByDescending(mh => mh.CompletedDate)
                    .Select(mh => new
                    {
                        id = mh.Id,
                        vehicleId = mh.VehicleId,
                        vehicleRegistration = _context.Vehicles
                            .Where(v => v.Id == mh.VehicleId)
                            .Select(v => v.Registration)
                            .FirstOrDefault(),
                        completedDate = mh.CompletedDate,
                        maintenanceType = mh.MaintenanceType,
                        component = mh.Component,
                        description = mh.Description,
                        cost = mh.Cost,
                        invoiceNumber = mh.InvoiceNumber
                    })
                    .ToListAsync();

                var totalRevenue = revenueDetails.Sum(r => r.cost);
                var averageRevenue = revenueDetails.Count > 0 ? totalRevenue / revenueDetails.Count : 0;

                return Ok(new
                {
                    startDate = start,
                    endDate = end,
                    totalRevenue = totalRevenue,
                    averageRevenue = averageRevenue,
                    jobCount = revenueDetails.Count,
                    details = revenueDetails
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error generating revenue report", error = ex.Message });
            }
        }

        [HttpGet("user/{userId}/scheduled-alerts")]
        public async Task<IActionResult> GetScheduledAlerts(string userId)
        {
            try
            {
                if (!Guid.TryParse(userId, out Guid parsedUserId))
                {
                    return Ok(new
                    {
                        upcomingJobsCount = 0,
                        totalScheduledCount = 0,
                        upcomingJobs = new List<object>()
                    });
                }

                // Get the service provider profile to get the business name
                var profile = await _context.ServiceProviderProfiles
                    .FirstOrDefaultAsync(sp => sp.UserId == parsedUserId);

                if (profile == null || string.IsNullOrEmpty(profile.BusinessName))
                {
                    return Ok(new
                    {
                        upcomingJobsCount = 0,
                        totalScheduledCount = 0,
                        upcomingJobs = new List<object>()
                    });
                }

                var serviceProviderName = profile.BusinessName;

                // Get upcoming scheduled appointments (next 7 days)
                var sevenDaysFromNow = DateTime.UtcNow.AddDays(7);
                var upcomingJobs = await _context.MechanicalRequests
                    .Where(mr => mr.ServiceProvider == serviceProviderName 
                        && mr.State == "Scheduled" 
                        && mr.ScheduledDate.HasValue 
                        && mr.ScheduledDate.Value >= DateTime.UtcNow
                        && mr.ScheduledDate.Value <= sevenDaysFromNow)
                    .OrderBy(mr => mr.ScheduledDate)
                    .Select(mr => new
                    {
                        id = mr.Id,
                        vehicleId = mr.VehicleId,
                        vehicleRegistration = _context.Vehicles
                            .Where(v => v.Id == mr.VehicleId)
                            .Select(v => v.Registration)
                            .FirstOrDefault(),
                        vehicleMake = _context.Vehicles
                            .Where(v => v.Id == mr.VehicleId)
                            .Select(v => v.Make)
                            .FirstOrDefault(),
                        vehicleModel = _context.Vehicles
                            .Where(v => v.Id == mr.VehicleId)
                            .Select(v => v.Model)
                            .FirstOrDefault(),
                        scheduledDate = mr.ScheduledDate,
                        category = mr.Category,
                        description = mr.Description,
                        location = mr.Location,
                        priority = mr.Priority
                    })
                    .ToListAsync();

                // Get total scheduled jobs count
                var totalScheduled = await _context.MechanicalRequests
                    .Where(mr => mr.ServiceProvider == serviceProviderName 
                        && mr.State == "Scheduled" 
                        && mr.ScheduledDate.HasValue 
                        && mr.ScheduledDate.Value >= DateTime.UtcNow)
                    .CountAsync();

                return Ok(new
                {
                    upcomingJobsCount = upcomingJobs.Count,
                    totalScheduledCount = totalScheduled,
                    upcomingJobs = upcomingJobs
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching scheduled alerts: {ex.Message}");
                return StatusCode(500, new { message = "Error fetching scheduled alerts", error = ex.Message });
            }
        }

        [HttpGet("debug/service-providers")]
        public async Task<IActionResult> GetServiceProviderNames()
        {
            try
            {
                // Get distinct service provider names from MaintenanceHistories
                var providersInMaintenance = await _context.MaintenanceHistories
                    .Where(mh => mh.ServiceProvider != null)
                    .Select(mh => mh.ServiceProvider)
                    .Distinct()
                    .ToListAsync();

                // Get distinct service provider names from MechanicalRequests
                var providersInRequests = await _context.MechanicalRequests
                    .Where(mr => mr.ServiceProvider != null)
                    .Select(mr => mr.ServiceProvider)
                    .Distinct()
                    .ToListAsync();

                // Get business names from ServiceProviderProfiles
                var registeredProviders = await _context.ServiceProviderProfiles
                    .Select(sp => new { sp.BusinessName, sp.Email, sp.IsActive })
                    .ToListAsync();

                return Ok(new
                {
                    providersInMaintenanceHistory = providersInMaintenance,
                    providersInMechanicalRequests = providersInRequests,
                    registeredServiceProviders = registeredProviders
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching debug data", error = ex.Message });
            }
        }
    }
}
