using System;
using System.Linq;
using System.Threading.Tasks;
using MzansiFleet.Domain.Entities;
using MzansiFleet.Repository;
using Microsoft.EntityFrameworkCore;

namespace MzansiFleet.Application.Services
{
    public class VehicleNotificationService
    {
        private readonly MzansiFleetDbContext _context;

        public VehicleNotificationService(MzansiFleetDbContext context)
        {
            _context = context;
        }

        // Send message to driver
        private async Task SendMessageToDriver(Guid driverId, string subject, string messageBody, Guid? relatedVehicleId = null)
        {
            try
            {
                Console.WriteLine($"[Notification] Attempting to send notification to driver: {driverId}");
                
                // Get driver user
                var driverUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == driverId && u.Role == "Driver");

                if (driverUser == null)
                {
                    Console.WriteLine($"[Notification] Driver user not found with ID: {driverId}");
                    return;
                }

                Console.WriteLine($"[Notification] Driver found: {driverUser.Email} (ID: {driverUser.Id})");

                // Create and send message
                var message = new Message
                {
                    Id = Guid.NewGuid(),
                    SenderId = driverUser.Id, // Send from driver to driver (system notification)
                    ReceiverId = driverUser.Id,
                    Subject = subject,
                    Content = messageBody,
                    CreatedAt = DateTime.UtcNow,
                    IsRead = false,
                    RelatedEntityType = relatedVehicleId.HasValue ? "Vehicle" : null,
                    RelatedEntityId = relatedVehicleId
                };

                _context.Messages.Add(message);
                await _context.SaveChangesAsync();
                
                Console.WriteLine($"[Notification] SUCCESS: Message sent to driver {driverUser.Email}");
            }
            catch (Exception ex)
            {
                // Log error but don't fail the main operation
                Console.WriteLine($"[Notification] EXCEPTION: Failed to send notification to driver: {ex.Message}");
                Console.WriteLine($"[Notification] Stack trace: {ex.StackTrace}");
            }
        }

        // Send message to service provider
        private async Task SendMessageToServiceProvider(string businessName, string subject, string messageBody, Guid? relatedVehicleId = null)
        {
            try
            {
                Console.WriteLine($"[Notification] Attempting to send notification to service provider: {businessName}");
                
                // Get service provider by business name
                var serviceProvider = await _context.ServiceProviderProfiles
                    .FirstOrDefaultAsync(sp => sp.BusinessName == businessName && sp.IsActive);

                if (serviceProvider == null)
                {
                    Console.WriteLine($"[Notification] Service provider not found with business name: {businessName}");
                    return;
                }

                // Get the user for this service provider
                var serviceProviderUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == serviceProvider.UserId && u.Role == "ServiceProvider");

                if (serviceProviderUser == null)
                {
                    Console.WriteLine($"[Notification] Service provider user not found for business: {businessName}");
                    return;
                }

                Console.WriteLine($"[Notification] Service provider found: {serviceProviderUser.Email} (ID: {serviceProviderUser.Id})");

                // Create and send message
                var message = new Message
                {
                    Id = Guid.NewGuid(),
                    SenderId = serviceProviderUser.Id, // Send from provider to provider (system notification)
                    ReceiverId = serviceProviderUser.Id,
                    Subject = subject,
                    Content = messageBody,
                    CreatedAt = DateTime.UtcNow,
                    IsRead = false,
                    RelatedEntityType = relatedVehicleId.HasValue ? "Vehicle" : null,
                    RelatedEntityId = relatedVehicleId
                };

                _context.Messages.Add(message);
                await _context.SaveChangesAsync();
                
                Console.WriteLine($"[Notification] SUCCESS: Message sent to service provider {serviceProviderUser.Email}");
            }
            catch (Exception ex)
            {
                // Log error but don't fail the main operation
                Console.WriteLine($"[Notification] EXCEPTION: Failed to send notification to service provider: {ex.Message}");
                Console.WriteLine($"[Notification] Stack trace: {ex.StackTrace}");
            }
        }

        // Send message to vehicle owner
        private async Task SendMessageToOwner(Guid vehicleId, string subject, string messageBody)
        {
            try
            {
                Console.WriteLine($"[Notification] Attempting to send notification for vehicle: {vehicleId}");
                
                // Get vehicle to find tenant/owner
                var vehicle = await _context.Vehicles
                    .FirstOrDefaultAsync(v => v.Id == vehicleId);

                if (vehicle == null)
                {
                    Console.WriteLine($"[Notification] ERROR: Vehicle not found with ID: {vehicleId}");
                    return;
                }

                Console.WriteLine($"[Notification] Vehicle found: {vehicle.Registration}, TenantId: {vehicle.TenantId}");

                // Find owner user by matching TenantId and Role
                var ownerUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.TenantId == vehicle.TenantId && u.Role == "Owner");

                if (ownerUser == null)
                {
                    Console.WriteLine($"[Notification] ERROR: No owner user found for TenantId: {vehicle.TenantId}");
                    Console.WriteLine($"[Notification] Searching for any user with TenantId: {vehicle.TenantId}");
                    
                    var allTenantUsers = await _context.Users
                        .Where(u => u.TenantId == vehicle.TenantId)
                        .ToListAsync();
                    
                    Console.WriteLine($"[Notification] Found {allTenantUsers.Count} users for this tenant:");
                    foreach (var u in allTenantUsers)
                    {
                        Console.WriteLine($"[Notification]   - User: {u.Email}, Role: {u.Role}, ID: {u.Id}");
                    }
                    return;
                }

                Console.WriteLine($"[Notification] Owner found: {ownerUser.Email} (ID: {ownerUser.Id})");

                // Create and send message
                var message = new Message
                {
                    Id = Guid.NewGuid(),
                    SenderId = ownerUser.Id, // Send from owner to owner (system notification)
                    ReceiverId = ownerUser.Id,
                    Subject = subject,
                    Content = messageBody,
                    CreatedAt = DateTime.UtcNow,
                    IsRead = false,
                    RelatedEntityType = "Vehicle",
                    RelatedEntityId = vehicleId
                };

                _context.Messages.Add(message);
                await _context.SaveChangesAsync();
                
                Console.WriteLine($"[Notification] SUCCESS: Message sent to {ownerUser.Email}");
            }
            catch (Exception ex)
            {
                // Log error but don't fail the main operation
                Console.WriteLine($"[Notification] EXCEPTION: Failed to send notification: {ex.Message}");
                Console.WriteLine($"[Notification] Stack trace: {ex.StackTrace}");
            }
        }

        // Maintenance notifications
        public async Task NotifyMaintenanceRequested(Guid vehicleId, string maintenanceType, string description)
        {
            var vehicle = await _context.Vehicles.FindAsync(vehicleId);
            var subject = $"New Maintenance Request: {vehicle?.Registration ?? "Unknown Vehicle"}";
            var body = $"A new maintenance request has been submitted for your vehicle {vehicle?.Registration}.\n\n" +
                      $"Type: {maintenanceType}\n" +
                      $"Description: {description}\n\n" +
                      $"Please review this request in your dashboard.";

            await SendMessageToOwner(vehicleId, subject, body);
        }

        public async Task NotifyMaintenanceScheduled(Guid vehicleId, string maintenanceType, DateTime scheduledDate)
        {
            var vehicle = await _context.Vehicles.FindAsync(vehicleId);
            var subject = $"Maintenance Scheduled: {vehicle?.Registration ?? "Unknown Vehicle"}";
            var body = $"Maintenance has been scheduled for your vehicle {vehicle?.Registration}.\n\n" +
                      $"Type: {maintenanceType}\n" +
                      $"Scheduled Date: {scheduledDate:yyyy-MM-dd HH:mm}\n\n" +
                      $"Please ensure the vehicle is available at the scheduled time.";

            await SendMessageToOwner(vehicleId, subject, body);
        }

        public async Task NotifyDriverMaintenanceScheduled(Guid driverId, Guid vehicleId, string maintenanceType, DateTime scheduledDate, string serviceProvider)
        {
            var vehicle = await _context.Vehicles.FindAsync(vehicleId);
            var subject = $"Maintenance Request Approved: {vehicle?.Registration ?? "Unknown Vehicle"}";
            var body = $"Your maintenance request has been approved and scheduled.\n\n" +
                      $"Vehicle: {vehicle?.Registration}\n" +
                      $"Type: {maintenanceType}\n" +
                      $"Service Provider: {serviceProvider}\n" +
                      $"Scheduled Date: {scheduledDate:yyyy-MM-dd HH:mm}\n\n" +
                      $"Please ensure the vehicle is available at the scheduled time.";

            await SendMessageToDriver(driverId, subject, body, vehicleId);
        }

        public async Task NotifyDriverMaintenanceDeclined(Guid driverId, Guid vehicleId, string maintenanceType, string declineReason)
        {
            var vehicle = await _context.Vehicles.FindAsync(vehicleId);
            var subject = $"Maintenance Request Declined: {vehicle?.Registration ?? "Unknown Vehicle"}";
            var body = $"Your maintenance request has been declined.\n\n" +
                      $"Vehicle: {vehicle?.Registration}\n" +
                      $"Type: {maintenanceType}\n" +
                      $"Reason: {declineReason}\n\n" +
                      $"Please contact your supervisor if you have any questions.";

            await SendMessageToDriver(driverId, subject, body, vehicleId);
        }

        public async Task NotifyDriverMaintenanceApproved(Guid driverId, Guid vehicleId, string maintenanceType)
        {
            var vehicle = await _context.Vehicles.FindAsync(vehicleId);
            var subject = $"Maintenance Request Approved: {vehicle?.Registration ?? "Unknown Vehicle"}";
            var body = $"Your maintenance request has been approved.\n\n" +
                      $"Vehicle: {vehicle?.Registration}\n" +
                      $"Type: {maintenanceType}\n\n" +
                      $"The maintenance will be scheduled soon. You will receive another notification with the schedule details.";

            await SendMessageToDriver(driverId, subject, body, vehicleId);
        }

        public async Task NotifyServiceProviderMaintenanceScheduled(string serviceProviderBusinessName, Guid vehicleId, string maintenanceType, DateTime scheduledDate, string description)
        {
            var vehicle = await _context.Vehicles.FindAsync(vehicleId);
            var subject = $"New Maintenance Job Assigned: {vehicle?.Registration ?? "Unknown Vehicle"}";
            var body = $"You have been assigned a new maintenance job.\n\n" +
                      $"Vehicle: {vehicle?.Registration}\n" +
                      $"Make/Model: {vehicle?.Make} {vehicle?.Model}\n" +
                      $"Type: {maintenanceType}\n" +
                      $"Scheduled Date: {scheduledDate:yyyy-MM-dd HH:mm}\n" +
                      $"Description: {description}\n\n" +
                      $"Please ensure you are available at the scheduled time.";

            await SendMessageToServiceProvider(serviceProviderBusinessName, subject, body, vehicleId);
        }

        public async Task NotifyMaintenanceCompleted(Guid vehicleId, string maintenanceType, decimal cost, DateTime completedDate)
        {
            var vehicle = await _context.Vehicles.FindAsync(vehicleId);
            var subject = $"Maintenance Completed: {vehicle?.Registration ?? "Unknown Vehicle"}";
            var body = $"Maintenance has been completed for your vehicle {vehicle?.Registration}.\n\n" +
                      $"Type: {maintenanceType}\n" +
                      $"Completed Date: {completedDate:yyyy-MM-dd HH:mm}\n" +
                      $"Cost: R{cost:N2}\n\n" +
                      $"Your vehicle is now ready for operation.";

            await SendMessageToOwner(vehicleId, subject, body);
        }

        // Roadside assistance notifications
        public async Task NotifyRoadsideAssistanceRequested(Guid vehicleId, string assistanceType, string location, string issueDescription)
        {
            var vehicle = await _context.Vehicles.FindAsync(vehicleId);
            var subject = $"Roadside Assistance Requested: {vehicle?.Registration ?? "Unknown Vehicle"}";
            var body = $"A roadside assistance request has been submitted for your vehicle {vehicle?.Registration}.\n\n" +
                      $"Assistance Type: {assistanceType}\n" +
                      $"Location: {location}\n" +
                      $"Issue: {issueDescription}\n\n" +
                      $"Service providers have been notified and will respond shortly.";

            await SendMessageToOwner(vehicleId, subject, body);
        }

        public async Task NotifyServiceProvidersRoadsideAssistance(string assistanceType, string location, Guid requestId)
        {
            try
            {
                Console.WriteLine($"[Notification] Notifying service providers about roadside assistance request: {requestId}");

                // Get all service providers that offer "Roadside Assistance"
                var serviceProviders = await _context.ServiceProviderProfiles
                    .Where(sp => sp.IsActive && 
                               !string.IsNullOrEmpty(sp.ServiceTypes) && 
                               EF.Functions.Like(sp.ServiceTypes.ToLower(), "%roadside assistance%"))
                    .ToListAsync();

                Console.WriteLine($"[Notification] Found {serviceProviders.Count} service providers offering roadside assistance");

                foreach (var sp in serviceProviders)
                {
                    // Get the user for this service provider
                    var serviceProviderUser = await _context.Users
                        .FirstOrDefaultAsync(u => u.Id == sp.UserId && u.Role == "ServiceProvider");

                    if (serviceProviderUser == null)
                    {
                        Console.WriteLine($"[Notification] Service provider user not found for {sp.BusinessName}");
                        continue;
                    }

                    var subject = $"New Roadside Assistance Request Available";
                    var body = $"A new roadside assistance request is available in your area.\n\n" +
                              $"Assistance Type: {assistanceType}\n" +
                              $"Location: {location}\n\n" +
                              $"Please check your dashboard for more details and respond if you can assist.";

                    // Create and send message
                    var message = new Message
                    {
                        Id = Guid.NewGuid(),
                        SenderId = serviceProviderUser.Id, // Send from provider to provider (system notification)
                        ReceiverId = serviceProviderUser.Id,
                        Subject = subject,
                        Content = body,
                        CreatedAt = DateTime.UtcNow,
                        IsRead = false,
                        RelatedEntityType = "RoadsideAssistanceRequest",
                        RelatedEntityId = requestId
                    };

                    _context.Messages.Add(message);
                    Console.WriteLine($"[Notification] Queued notification for service provider: {sp.BusinessName}");
                }

                await _context.SaveChangesAsync();
                Console.WriteLine($"[Notification] SUCCESS: Notified {serviceProviders.Count} service providers");
            }
            catch (Exception ex)
            {
                // Log error but don't fail the main operation
                Console.WriteLine($"[Notification] EXCEPTION: Failed to notify service providers: {ex.Message}");
                Console.WriteLine($"[Notification] Stack trace: {ex.StackTrace}");
            }
        }

        // Financial notifications
        public async Task NotifyExpenseRecorded(Guid vehicleId, string category, decimal amount, DateTime date, string description)
        {
            var vehicle = await _context.Vehicles.FindAsync(vehicleId);
            var subject = $"New Expense: {vehicle?.Registration ?? "Unknown Vehicle"}";
            var body = $"A new expense has been recorded for your vehicle {vehicle?.Registration}.\n\n" +
                      $"Category: {category}\n" +
                      $"Amount: R{amount:N2}\n" +
                      $"Date: {date:yyyy-MM-dd}\n" +
                      $"Description: {description}\n\n" +
                      $"You can view more details in your vehicle financial reports.";

            await SendMessageToOwner(vehicleId, subject, body);
        }

        public async Task NotifyEarningRecorded(Guid vehicleId, string source, decimal amount, DateTime date, string description)
        {
            var vehicle = await _context.Vehicles.FindAsync(vehicleId);
            var subject = $"New Earning: {vehicle?.Registration ?? "Unknown Vehicle"}";
            var body = $"A new earning has been recorded for your vehicle {vehicle?.Registration}.\n\n" +
                      $"Source: {source}\n" +
                      $"Amount: R{amount:N2}\n" +
                      $"Date: {date:yyyy-MM-dd}\n" +
                      $"Description: {description}\n\n" +
                      $"You can view more details in your vehicle financial reports.";

            await SendMessageToOwner(vehicleId, subject, body);
        }
    }
}
