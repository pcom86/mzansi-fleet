using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using MzansiFleet.Repository;
using MzansiFleet.Repository.Repositories;
using MzansiFleet.Application.Handlers;
using System.Text.Json;
using System.Text.Json.Serialization;
using System;
using System.Threading.Tasks;
using MzansiFleet.Api;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using MzansiFleet.Api.Hubs;

namespace MzansiFleet.Api
{
    public class TimeSpanConverter : JsonConverter<TimeSpan>
    {
        public override TimeSpan Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var value = reader.GetString();
            return TimeSpan.TryParse(value, out var result) ? result : TimeSpan.Zero;
        }

        public override void Write(Utf8JsonWriter writer, TimeSpan value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value.ToString(@"hh\:mm\:ss"));
        }
    }

    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Configure logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// Add JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey is not configured");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
});

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp",
        policy =>
        {
            // Dev: allow every origin so LAN devices, Expo Go, and browsers all work.
            // Keep credentials enabled, so we use SetIsOriginAllowed instead of AllowAnyOrigin.
            policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
        });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.Converters.Add(new TimeSpanConverter());
    });
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register DbContext
builder.Services.AddDbContext<MzansiFleetDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
           .ConfigureWarnings(warnings => warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

// Register repositories
builder.Services.AddScoped<VehicleRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.IVehicleRepository, VehicleRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.ITenantRepository, MzansiFleet.Repository.Repositories.TenantRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.IUserRepository, MzansiFleet.Repository.Repositories.UserRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.IOwnerProfileRepository, MzansiFleet.Repository.Repositories.OwnerProfileRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.IDriverProfileRepository, MzansiFleet.Repository.Repositories.DriverProfileRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.IStaffProfileRepository, MzansiFleet.Repository.Repositories.StaffProfileRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.IServiceProviderProfileRepository, MzansiFleet.Repository.Repositories.ServiceProviderProfileRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.IServiceHistoryRepository, MzansiFleet.Repository.Repositories.ServiceHistoryRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.IMaintenanceHistoryRepository, MzansiFleet.Repository.Repositories.MaintenanceHistoryRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.IVehicleDocumentRepository, MzansiFleet.Repository.Repositories.VehicleDocumentRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.IMechanicalRequestRepository, MzansiFleet.Repository.Repositories.MechanicalRequestRepository>();

// Register services
builder.Services.AddScoped<MzansiFleet.Application.Services.VehicleNotificationService>();
builder.Services.AddScoped<MzansiFleet.Application.Services.IBookingIntegrationService, MzansiFleet.Application.Services.BookingIntegrationService>();
builder.Services.AddSingleton<MzansiFleet.Api.Services.OzowService>();

// Register Taxi Rank repositories
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.ITaxiRankRepository, MzansiFleet.Repository.Repositories.TaxiRankRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.ITaxiRankTripRepository, MzansiFleet.Repository.Repositories.TaxiRankTripRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.ITripPassengerRepository, MzansiFleet.Repository.Repositories.TripPassengerRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.ITripCostRepository, MzansiFleet.Repository.Repositories.TripCostRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.ITaxiMarshalRepository, MzansiFleet.Repository.Repositories.TaxiMarshalRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.ITaxiRankAdminRepository, MzansiFleet.Repository.Repositories.TaxiRankAdminRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.IVehicleTaxiRankRepository, MzansiFleet.Repository.Repositories.VehicleTaxiRankRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.IRouteRepository, MzansiFleet.Repository.Repositories.RouteRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.IScheduledTripBookingRepository, MzansiFleet.Repository.Repositories.ScheduledTripBookingRepository>();

// Register AI Services
builder.Services.AddScoped<MzansiFleet.Api.Services.AI.RouteOptimizationService>();
builder.Services.AddScoped<MzansiFleet.Api.Services.AI.DemandForecastingService>();
builder.Services.AddScoped<MzansiFleet.Api.Services.AI.ChatbotService>();
builder.Services.AddScoped<MzansiFleet.Api.Services.AI.FraudDetectionService>();
builder.Services.AddScoped<MzansiFleet.Api.Services.AI.ExternalAIService>();

// Register authentication handlers
builder.Services.AddScoped<LoginCommandHandler>();
builder.Services.AddScoped<LogoutCommandHandler>();
builder.Services.AddScoped<ChangePasswordCommandHandler>();
builder.Services.AddScoped<RegisterServiceProviderCommandHandler>();

// Register command handlers
builder.Services.AddScoped<CreateVehicleCommandHandler>();
builder.Services.AddScoped<CreateTenantCommandHandler>();
builder.Services.AddScoped<UpdateTenantCommandHandler>();
builder.Services.AddScoped<DeleteTenantCommandHandler>();
builder.Services.AddScoped<CreateUserCommandHandler>();
builder.Services.AddScoped<UpdateUserCommandHandler>();
builder.Services.AddScoped<DeleteUserCommandHandler>();
builder.Services.AddScoped<CreateOwnerProfileCommandHandler>();
builder.Services.AddScoped<UpdateOwnerProfileCommandHandler>();
builder.Services.AddScoped<DeleteOwnerProfileCommandHandler>();
builder.Services.AddScoped<CreateDriverCommandHandler>();
builder.Services.AddScoped<UpdateDriverCommandHandler>();
builder.Services.AddScoped<DeleteDriverCommandHandler>();
builder.Services.AddScoped<CreateStaffProfileCommandHandler>();
builder.Services.AddScoped<UpdateStaffProfileCommandHandler>();
builder.Services.AddScoped<DeleteStaffProfileCommandHandler>();
builder.Services.AddScoped<CreateServiceHistoryCommandHandler>();
builder.Services.AddScoped<UpdateServiceHistoryCommandHandler>();
builder.Services.AddScoped<DeleteServiceHistoryCommandHandler>();
builder.Services.AddScoped<CreateMaintenanceHistoryCommandHandler>();
builder.Services.AddScoped<UpdateMaintenanceHistoryCommandHandler>();
builder.Services.AddScoped<DeleteMaintenanceHistoryCommandHandler>();
builder.Services.AddScoped<CreateMechanicalRequestCommandHandler>();

// Register query handlers
builder.Services.AddScoped<GetVehiclesForTenantQueryHandler>();
builder.Services.AddScoped<GetTenantsQueryHandler>();
builder.Services.AddScoped<GetTenantByIdQueryHandler>();
builder.Services.AddScoped<GetUsersQueryHandler>();
builder.Services.AddScoped<GetUserByIdQueryHandler>();
builder.Services.AddScoped<GetOwnerProfilesQueryHandler>();
builder.Services.AddScoped<GetOwnerProfileByIdQueryHandler>();
builder.Services.AddScoped<GetDriversQueryHandler>();
builder.Services.AddScoped<GetDriverByIdQueryHandler>();
builder.Services.AddScoped<GetAllStaffProfilesQueryHandler>();
builder.Services.AddScoped<GetStaffProfileByIdQueryHandler>();
builder.Services.AddScoped<GetAllServiceHistoriesQueryHandler>();
builder.Services.AddScoped<GetServiceHistoryByIdQueryHandler>();
builder.Services.AddScoped<GetServiceHistoryByVehicleIdQueryHandler>();
builder.Services.AddScoped<GetLatestServiceByVehicleIdQueryHandler>();
builder.Services.AddScoped<GetAllMaintenanceHistoriesQueryHandler>();
builder.Services.AddScoped<GetMaintenanceHistoryByIdQueryHandler>();
builder.Services.AddScoped<GetMaintenanceHistoryByVehicleIdQueryHandler>();
builder.Services.AddScoped<GetLatestMaintenanceByVehicleIdQueryHandler>();
builder.Services.AddScoped<GetVehiclesNeedingServiceQueryHandler>();

var app = builder.Build();

// Configure the HTTP request pipeline.
// Configure logging
var logger = app.Services.GetRequiredService<ILogger<Program>>();
logger.LogInformation("Application starting up...");

// Test database connection
try
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<MzansiFleetDbContext>();
    await dbContext.Database.CanConnectAsync();
    logger.LogInformation("Database connection successful");
}
catch (Exception ex)
{
    logger.LogWarning(ex, "Database connection failed, but continuing startup");
}

// Apply migrations on startup
try
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<MzansiFleetDbContext>();
    await dbContext.Database.MigrateAsync();
    logger.LogInformation("Database migrations applied successfully");

    // Add QueueMarshal Permissions columns if missing
    await dbContext.Database.ExecuteSqlRawAsync(@"
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'QueueMarshals' AND column_name = 'Permissions_CanCaptureTrips') THEN
                ALTER TABLE ""QueueMarshals"" ADD COLUMN ""Permissions_CanCaptureTrips"" boolean NOT NULL DEFAULT true;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'QueueMarshals' AND column_name = 'Permissions_CanViewSchedules') THEN
                ALTER TABLE ""QueueMarshals"" ADD COLUMN ""Permissions_CanViewSchedules"" boolean NOT NULL DEFAULT true;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'QueueMarshals' AND column_name = 'Permissions_CanReceiveMessages') THEN
                ALTER TABLE ""QueueMarshals"" ADD COLUMN ""Permissions_CanReceiveMessages"" boolean NOT NULL DEFAULT true;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'QueueMarshals' AND column_name = 'Permissions_CanSendMessages') THEN
                ALTER TABLE ""QueueMarshals"" ADD COLUMN ""Permissions_CanSendMessages"" boolean NOT NULL DEFAULT true;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'QueueMarshals' AND column_name = 'Permissions_CanManageVehicles') THEN
                ALTER TABLE ""QueueMarshals"" ADD COLUMN ""Permissions_CanManageVehicles"" boolean NOT NULL DEFAULT false;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'QueueMarshals' AND column_name = 'Permissions_CanManageDrivers') THEN
                ALTER TABLE ""QueueMarshals"" ADD COLUMN ""Permissions_CanManageDrivers"" boolean NOT NULL DEFAULT false;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'QueueMarshals' AND column_name = 'Permissions_CanManageSchedules') THEN
                ALTER TABLE ""QueueMarshals"" ADD COLUMN ""Permissions_CanManageSchedules"" boolean NOT NULL DEFAULT false;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'QueueMarshals' AND column_name = 'Permissions_CanViewReports') THEN
                ALTER TABLE ""QueueMarshals"" ADD COLUMN ""Permissions_CanViewReports"" boolean NOT NULL DEFAULT false;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'QueueMarshals' AND column_name = 'Permissions_CanDeleteData') THEN
                ALTER TABLE ""QueueMarshals"" ADD COLUMN ""Permissions_CanDeleteData"" boolean NOT NULL DEFAULT false;
            END IF;
        END $$;
    ");
    logger.LogInformation("QueueMarshal Permissions columns ensured");

    // Add ScheduledTripId column if missing (safe idempotent alter)
    await dbContext.Database.ExecuteSqlRawAsync(@"
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'ScheduledTripBookings' 
                AND column_name = 'ScheduledTripId'
            ) THEN
                ALTER TABLE ""ScheduledTripBookings"" ADD COLUMN ""ScheduledTripId"" uuid NULL;
                CREATE INDEX IF NOT EXISTS ""IX_ScheduledTripBookings_ScheduledTripId"" ON ""ScheduledTripBookings"" (""ScheduledTripId"");
            END IF;
        END $$;
    ");
    // Align DailyTaxiQueue table with entity model
    await dbContext.Database.ExecuteSqlRawAsync(@"
        DO $$
        BEGIN
            -- Rename table from singular to plural if needed
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'DailyTaxiQueue')
               AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'DailyTaxiQueues') THEN
                ALTER TABLE ""DailyTaxiQueue"" RENAME TO ""DailyTaxiQueues"";
            END IF;
        END $$;
    ");
    await dbContext.Database.ExecuteSqlRawAsync(@"
        DO $$
        DECLARE t TEXT := 'DailyTaxiQueues';
        BEGIN
            -- Rename old columns to match entity if they exist
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'Priority')
               AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'QueuePosition') THEN
                ALTER TABLE ""DailyTaxiQueues"" RENAME COLUMN ""Priority"" TO ""QueuePosition"";
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'AvailableFrom')
               AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'JoinedAt') THEN
                ALTER TABLE ""DailyTaxiQueues"" RENAME COLUMN ""AvailableFrom"" TO ""JoinedAt"";
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'AssignedTripId')
               AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'RouteId') THEN
                ALTER TABLE ""DailyTaxiQueues"" RENAME COLUMN ""AssignedTripId"" TO ""RouteId"";
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'AssignedByUserId')
               AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'DispatchedByUserId') THEN
                ALTER TABLE ""DailyTaxiQueues"" RENAME COLUMN ""AssignedByUserId"" TO ""DispatchedByUserId"";
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'AssignedAt')
               AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'DepartedAt') THEN
                ALTER TABLE ""DailyTaxiQueues"" RENAME COLUMN ""AssignedAt"" TO ""DepartedAt"";
            END IF;
            -- Add missing columns
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'RouteId') THEN
                ALTER TABLE ""DailyTaxiQueues"" ADD COLUMN ""RouteId"" uuid;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'QueuePosition') THEN
                ALTER TABLE ""DailyTaxiQueues"" ADD COLUMN ""QueuePosition"" integer NOT NULL DEFAULT 0;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'JoinedAt') THEN
                ALTER TABLE ""DailyTaxiQueues"" ADD COLUMN ""JoinedAt"" interval NOT NULL DEFAULT '0';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'DepartedAt') THEN
                ALTER TABLE ""DailyTaxiQueues"" ADD COLUMN ""DepartedAt"" timestamp with time zone;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'DispatchedByUserId') THEN
                ALTER TABLE ""DailyTaxiQueues"" ADD COLUMN ""DispatchedByUserId"" uuid;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'PassengerCount') THEN
                ALTER TABLE ""DailyTaxiQueues"" ADD COLUMN ""PassengerCount"" integer;
            END IF;
        END $$;
    ");
    logger.LogInformation("DailyTaxiQueues schema aligned successfully");

    // Create QueueBooking and QueueBookingPassenger tables if they don't exist
    await dbContext.Database.ExecuteSqlRawAsync(@"
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'QueueBookings') THEN
                CREATE TABLE ""QueueBookings"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""UserId"" uuid NOT NULL,
                    ""QueueEntryId"" uuid NOT NULL,
                    ""TaxiRankId"" uuid NOT NULL,
                    ""RouteId"" uuid,
                    ""VehicleId"" uuid NOT NULL,
                    ""SeatsBooked"" integer NOT NULL DEFAULT 1,
                    ""TotalFare"" numeric NOT NULL DEFAULT 0,
                    ""PaymentMethod"" text NOT NULL DEFAULT 'EFT',
                    ""PaymentStatus"" text NOT NULL DEFAULT 'Pending',
                    ""PaymentReference"" text,
                    ""BankReference"" text,
                    ""PaidAt"" timestamp with time zone,
                    ""EftAccountName"" text,
                    ""EftBank"" text,
                    ""EftAccountNumber"" text,
                    ""EftBranchCode"" text,
                    ""Status"" text NOT NULL DEFAULT 'Pending',
                    ""Notes"" text,
                    ""CancellationReason"" text,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT now(),
                    ""UpdatedAt"" timestamp with time zone,
                    ""ConfirmedAt"" timestamp with time zone,
                    ""CancelledAt"" timestamp with time zone
                );
                CREATE INDEX ""IX_QueueBookings_UserId"" ON ""QueueBookings""(""UserId"");
                CREATE INDEX ""IX_QueueBookings_QueueEntryId"" ON ""QueueBookings""(""QueueEntryId"");
                CREATE INDEX ""IX_QueueBookings_TaxiRankId"" ON ""QueueBookings""(""TaxiRankId"");
                CREATE INDEX ""IX_QueueBookings_VehicleId"" ON ""QueueBookings""(""VehicleId"");
            END IF;
        END $$;
    ");

    await dbContext.Database.ExecuteSqlRawAsync(@"
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'QueueBookingPassengers') THEN
                CREATE TABLE ""QueueBookingPassengers"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""QueueBookingId"" uuid NOT NULL,
                    ""Name"" text NOT NULL,
                    ""ContactNumber"" text NOT NULL,
                    ""Email"" text,
                    ""Destination"" text,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT now()
                );
                CREATE INDEX ""IX_QueueBookingPassengers_QueueBookingId"" ON ""QueueBookingPassengers""(""QueueBookingId"");
            END IF;
        END $$;
    ");

    logger.LogInformation("Schema patches applied successfully");
}
catch (Exception ex)
{
    logger.LogWarning(ex, "Failed to apply database migrations, but continuing startup");
}

// Create taxi rank tables manually AFTER EF migrations
try
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    
    // Remove conflicting Routes table if it exists
    // Program_RemoveRoutes.RemoveRoutesTable(connectionString); // Commented out to allow Routes table to exist
    
    MigrationRunner.CreateTaxiRankTables(connectionString);
    
    // Create Routes table if it doesn't exist
    using var conn = new Npgsql.NpgsqlConnection(connectionString);
    conn.Open();
    using var routesCmd = conn.CreateCommand();
    routesCmd.CommandText = @"
        CREATE TABLE IF NOT EXISTS ""Routes"" (
            ""Id"" UUID PRIMARY KEY,
            ""TaxiRankId"" UUID NOT NULL,
            ""TenantId"" UUID NOT NULL,
            ""RouteName"" TEXT NOT NULL,
            ""DepartureStation"" TEXT NOT NULL,
            ""DestinationStation"" TEXT NOT NULL,
            ""DepartureTime"" INTERVAL NOT NULL,
            ""FrequencyMinutes"" INTEGER NOT NULL,
            ""DaysOfWeek"" TEXT NOT NULL,
            ""StandardFare"" DECIMAL(18,2) NOT NULL,
            ""ExpectedDurationMinutes"" INTEGER,
            ""MaxPassengers"" INTEGER,
            ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""Notes"" TEXT,
            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMP WITH TIME ZONE
        );
        
        CREATE INDEX IF NOT EXISTS ""IX_Routes_TaxiRankId"" ON ""Routes""(""TaxiRankId"");
        CREATE INDEX IF NOT EXISTS ""IX_Routes_TenantId"" ON ""Routes""(""TenantId"");
    ";
    routesCmd.ExecuteNonQuery();
    
    // Make User.TenantId nullable so riders/drivers without a tenant can register
    using var fixUserTenantCmd = conn.CreateCommand();
    fixUserTenantCmd.CommandText = @"
        ALTER TABLE ""Users"" DROP CONSTRAINT IF EXISTS ""FK_Users_Tenants_TenantId"";
        ALTER TABLE ""Users"" ALTER COLUMN ""TenantId"" DROP NOT NULL;
        ALTER TABLE ""Users"" ADD CONSTRAINT ""FK_Users_Tenants_TenantId""
            FOREIGN KEY (""TenantId"") REFERENCES ""Tenants""(""Id"") ON DELETE SET NULL;
    ";
    fixUserTenantCmd.ExecuteNonQuery();

    // Add FullName column to Users table if it doesn't exist
    using var addFullNameCmd = conn.CreateCommand();
    addFullNameCmd.CommandText = @"
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'Users' AND column_name = 'FullName'
            ) THEN
                ALTER TABLE ""Users"" ADD COLUMN ""FullName"" TEXT;
            END IF;
        END $$;
    ";
    addFullNameCmd.ExecuteNonQuery();

    // Fix ScheduledTrips table: MigrationRunner created with "TripScheduleId" but EF expects "RouteId"
    using var fixScheduledTripsCmd = conn.CreateCommand();
    fixScheduledTripsCmd.CommandText = @"
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ScheduledTrips' AND column_name = 'RouteId') THEN
                ALTER TABLE ""ScheduledTrips"" ADD COLUMN ""RouteId"" UUID;
                UPDATE ""ScheduledTrips"" SET ""RouteId"" = ""TripScheduleId"" WHERE ""RouteId"" IS NULL;
            END IF;
        END $$;
        ALTER TABLE ""ScheduledTrips"" ALTER COLUMN ""TripScheduleId"" DROP NOT NULL;
        ALTER TABLE ""ScheduledTrips"" DROP CONSTRAINT IF EXISTS ""FK_ScheduledTrips_TripSchedules"";
        -- CancelledBy is string in EF entity but uuid in MigrationRunner - change to text
        ALTER TABLE ""ScheduledTrips"" ALTER COLUMN ""CancelledBy"" TYPE TEXT USING ""CancelledBy""::TEXT;
        CREATE INDEX IF NOT EXISTS ""IX_ScheduledTrips_RouteId"" ON ""ScheduledTrips""(""RouteId"");
    ";
    fixScheduledTripsCmd.ExecuteNonQuery();

    // Fix ScheduledTripBookings table: MigrationRunner created with fewer columns than EF entity expects
    using var fixBookingsCmd = conn.CreateCommand();
    fixBookingsCmd.CommandText = @"
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ScheduledTripBookings' AND column_name = 'RouteId') THEN
                ALTER TABLE ""ScheduledTripBookings"" ADD COLUMN ""RouteId"" UUID;
                UPDATE ""ScheduledTripBookings"" SET ""RouteId"" = ""TripScheduleId"" WHERE ""RouteId"" IS NULL;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ScheduledTripBookings' AND column_name = 'SeatNumbers') THEN
                ALTER TABLE ""ScheduledTripBookings"" ADD COLUMN ""SeatNumbers"" INTEGER[] NOT NULL DEFAULT '{}';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ScheduledTripBookings' AND column_name = 'PaymentMethod') THEN
                ALTER TABLE ""ScheduledTripBookings"" ADD COLUMN ""PaymentMethod"" TEXT NOT NULL DEFAULT '';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ScheduledTripBookings' AND column_name = 'PaymentStatus') THEN
                ALTER TABLE ""ScheduledTripBookings"" ADD COLUMN ""PaymentStatus"" TEXT NOT NULL DEFAULT 'Pending';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ScheduledTripBookings' AND column_name = 'PaymentReference') THEN
                ALTER TABLE ""ScheduledTripBookings"" ADD COLUMN ""PaymentReference"" TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ScheduledTripBookings' AND column_name = 'PaidAt') THEN
                ALTER TABLE ""ScheduledTripBookings"" ADD COLUMN ""PaidAt"" TIMESTAMP WITH TIME ZONE;
            END IF;
        END $$;
        ALTER TABLE ""ScheduledTripBookings"" ALTER COLUMN ""TripScheduleId"" DROP NOT NULL;
        ALTER TABLE ""ScheduledTripBookings"" DROP CONSTRAINT IF EXISTS ""FK_ScheduledTripBookings_TripSchedules"";
        CREATE INDEX IF NOT EXISTS ""IX_ScheduledTripBookings_RouteId"" ON ""ScheduledTripBookings""(""RouteId"");
    ";
    fixBookingsCmd.ExecuteNonQuery();
    
    // Fix RouteStops table: MigrationRunner created it with "TripScheduleId" but EF expects "RouteId"
    // Add RouteId column if missing, and make TripScheduleId nullable
    using var fixRouteStopsCmd = conn.CreateCommand();
    fixRouteStopsCmd.CommandText = @"
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'RouteStops' AND column_name = 'RouteId'
            ) THEN
                ALTER TABLE ""RouteStops"" ADD COLUMN ""RouteId"" UUID;
            END IF;
            
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'RouteStops' AND column_name = 'UpdatedAt'
            ) THEN
                ALTER TABLE ""RouteStops"" ADD COLUMN ""UpdatedAt"" TIMESTAMP WITH TIME ZONE;
            END IF;
        END $$;
        
        -- Make TripScheduleId nullable so EF inserts (which only set RouteId) don't fail
        ALTER TABLE ""RouteStops"" ALTER COLUMN ""TripScheduleId"" DROP NOT NULL;
        
        -- Drop the foreign key constraint on TripScheduleId if it exists
        ALTER TABLE ""RouteStops"" DROP CONSTRAINT IF EXISTS ""FK_RouteStops_TripSchedules"";
        
        CREATE INDEX IF NOT EXISTS ""IX_RouteStops_RouteId"" ON ""RouteStops""(""RouteId"");
    ";
    fixRouteStopsCmd.ExecuteNonQuery();
    
    // Fix RouteVehicles table: same issue - "TripScheduleId" vs "RouteId"
    using var fixRouteVehiclesCmd = conn.CreateCommand();
    fixRouteVehiclesCmd.CommandText = @"
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'RouteVehicles' AND column_name = 'RouteId'
            ) THEN
                ALTER TABLE ""RouteVehicles"" ADD COLUMN ""RouteId"" UUID;
            END IF;
        END $$;
        
        ALTER TABLE ""RouteVehicles"" ALTER COLUMN ""TripScheduleId"" DROP NOT NULL;
        ALTER TABLE ""RouteVehicles"" DROP CONSTRAINT IF EXISTS ""FK_RouteVehicles_TripSchedules"";
        
        CREATE INDEX IF NOT EXISTS ""IX_RouteVehicles_RouteId"" ON ""RouteVehicles""(""RouteId"");
    ";
    fixRouteVehiclesCmd.ExecuteNonQuery();

    using var fixTaxiRankTripsCmd = conn.CreateCommand();
    fixTaxiRankTripsCmd.CommandText = @"
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'TaxiRankTrips' AND column_name = 'CompletedAt'
            ) THEN
                ALTER TABLE ""TaxiRankTrips"" ADD COLUMN ""CompletedAt"" TIMESTAMP WITH TIME ZONE;
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'TaxiRankTrips' AND column_name = 'Latitude'
            ) THEN
                ALTER TABLE ""TaxiRankTrips"" ADD COLUMN ""Latitude"" NUMERIC;
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'TaxiRankTrips' AND column_name = 'Longitude'
            ) THEN
                ALTER TABLE ""TaxiRankTrips"" ADD COLUMN ""Longitude"" NUMERIC;
            END IF;
        END $$;
    ";
    fixTaxiRankTripsCmd.ExecuteNonQuery();
    
    logger.LogInformation("Taxi rank tables created successfully");

    // Add PaymentMethod and PaymentReference columns to TripPassengers if missing
    using var paymentCmd = conn.CreateCommand();
    paymentCmd.CommandText = @"
        ALTER TABLE ""TripPassengers"" ADD COLUMN IF NOT EXISTS ""PaymentMethod"" text NOT NULL DEFAULT 'Cash';
        ALTER TABLE ""TripPassengers"" ADD COLUMN IF NOT EXISTS ""PaymentReference"" text;
    ";
    paymentCmd.ExecuteNonQuery();
    logger.LogInformation("TripPassengers payment columns ensured");

    // Create DriverBehaviorEvents table if it doesn't exist
    using var behaviorCmd = conn.CreateCommand();
    behaviorCmd.CommandText = @"
        CREATE TABLE IF NOT EXISTS ""DriverBehaviorEvents"" (
            ""Id"" UUID PRIMARY KEY,
            ""DriverId"" UUID NOT NULL,
            ""VehicleId"" UUID,
            ""ReportedById"" UUID,
            ""TenantId"" UUID,
            ""Category"" TEXT NOT NULL,
            ""Severity"" TEXT NOT NULL DEFAULT 'Medium',
            ""Description"" TEXT NOT NULL,
            ""Location"" TEXT,
            ""PointsImpact"" INTEGER NOT NULL DEFAULT 0,
            ""EventType"" TEXT NOT NULL DEFAULT 'Negative',
            ""EventDate"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            ""Notes"" TEXT,
            ""EvidenceUrl"" TEXT,
            ""IsResolved"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""ResolvedAt"" TIMESTAMP WITH TIME ZONE,
            ""Resolution"" TEXT
        );
        CREATE INDEX IF NOT EXISTS ""IX_DriverBehaviorEvents_DriverId"" ON ""DriverBehaviorEvents""(""DriverId"");
        CREATE INDEX IF NOT EXISTS ""IX_DriverBehaviorEvents_TenantId"" ON ""DriverBehaviorEvents""(""TenantId"");
        CREATE INDEX IF NOT EXISTS ""IX_DriverBehaviorEvents_EventDate"" ON ""DriverBehaviorEvents""(""EventDate"");
    ";
    behaviorCmd.ExecuteNonQuery();
    logger.LogInformation("DriverBehaviorEvents table ensured");

    // Patch Messages table: migration created with SenderId/ReceiverId but entity now has many more columns
    using var fixMessagesCmd = conn.CreateCommand();
    fixMessagesCmd.CommandText = @"
        ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""SenderType"" TEXT NOT NULL DEFAULT 'User';
        ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""SenderName"" TEXT;
        ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""RecipientType"" TEXT NOT NULL DEFAULT 'User';
        ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""RecipientId"" UUID;
        ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""RecipientMarshalId"" UUID;
        ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""RecipientDriverId"" UUID;
        ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""TaxiRankId"" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
        ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""MessageType"" TEXT NOT NULL DEFAULT 'Info';
        ALTER TABLE ""Messages"" ADD COLUMN IF NOT EXISTS ""ExpiresAt"" TIMESTAMP WITH TIME ZONE;
        -- Backfill: copy old ReceiverId into RecipientId if it exists and RecipientId is empty
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Messages' AND column_name = 'ReceiverId') THEN
                UPDATE ""Messages"" SET ""RecipientId"" = ""ReceiverId"" WHERE ""RecipientId"" IS NULL;
            END IF;
        END $$;
        -- Make SenderId nullable (entity has Guid? SenderId)
        ALTER TABLE ""Messages"" ALTER COLUMN ""SenderId"" DROP NOT NULL;
    ";
    fixMessagesCmd.ExecuteNonQuery();
    logger.LogInformation("Messages table columns patched");

    // Create DailyTaxiQueues table for queue management
    using var queueCmd = conn.CreateCommand();
    queueCmd.CommandText = @"
        CREATE TABLE IF NOT EXISTS ""DailyTaxiQueues"" (
            ""Id""                  UUID PRIMARY KEY,
            ""TaxiRankId""          UUID NOT NULL REFERENCES ""TaxiRanks""(""Id"") ON DELETE CASCADE,
            ""RouteId""             UUID REFERENCES ""Routes""(""Id"") ON DELETE SET NULL,
            ""VehicleId""           UUID NOT NULL REFERENCES ""Vehicles""(""Id"") ON DELETE CASCADE,
            ""DriverId""            UUID REFERENCES ""DriverProfiles""(""Id"") ON DELETE SET NULL,
            ""TenantId""            UUID NOT NULL,
            ""QueueDate""           DATE NOT NULL,
            ""QueuePosition""       INT NOT NULL DEFAULT 0,
            ""JoinedAt""            TIME NOT NULL,
            ""Status""              TEXT NOT NULL DEFAULT 'Waiting',
            ""DepartedAt""          TIMESTAMP WITH TIME ZONE,
            ""DispatchedByUserId""  UUID,
            ""PassengerCount""      INT,
            ""Notes""               TEXT,
            ""CreatedAt""           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            ""UpdatedAt""           TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS ""IX_DailyTaxiQueues_RankDate"" ON ""DailyTaxiQueues""(""TaxiRankId"", ""QueueDate"");
        CREATE INDEX IF NOT EXISTS ""IX_DailyTaxiQueues_RouteDate"" ON ""DailyTaxiQueues""(""RouteId"", ""QueueDate"");
        CREATE INDEX IF NOT EXISTS ""IX_DailyTaxiQueues_Vehicle""  ON ""DailyTaxiQueues""(""VehicleId"", ""QueueDate"");
    ";
    queueCmd.ExecuteNonQuery();
    logger.LogInformation("DailyTaxiQueues table ensured");

    // Create QueueBookings table for rider queue bookings
    using var queueBookingCmd = conn.CreateCommand();
    queueBookingCmd.CommandText = @"
        CREATE TABLE IF NOT EXISTS ""QueueBookings"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NOT NULL,
            ""QueueEntryId"" UUID NOT NULL,
            ""TaxiRankId"" UUID NOT NULL,
            ""RouteId"" UUID,
            ""VehicleId"" UUID NOT NULL,
            ""SeatsBooked"" INTEGER NOT NULL DEFAULT 1,
            ""TotalFare"" NUMERIC NOT NULL DEFAULT 0,
            ""PaymentMethod"" TEXT NOT NULL DEFAULT 'EFT',
            ""PaymentStatus"" TEXT NOT NULL DEFAULT 'Pending',
            ""PaymentReference"" TEXT,
            ""BankReference"" TEXT,
            ""PaidAt"" TIMESTAMP WITH TIME ZONE,
            ""EftAccountName"" TEXT,
            ""EftBank"" TEXT,
            ""EftAccountNumber"" TEXT,
            ""EftBranchCode"" TEXT,
            ""Status"" TEXT NOT NULL DEFAULT 'Pending',
            ""Notes"" TEXT,
            ""CancellationReason"" TEXT,
            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMP WITH TIME ZONE,
            ""ConfirmedAt"" TIMESTAMP WITH TIME ZONE,
            ""CancelledAt"" TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS ""IX_QueueBookings_QueueEntryId"" ON ""QueueBookings""(""QueueEntryId"");
        CREATE INDEX IF NOT EXISTS ""IX_QueueBookings_UserId"" ON ""QueueBookings""(""UserId"");
        CREATE INDEX IF NOT EXISTS ""IX_QueueBookings_TaxiRankId"" ON ""QueueBookings""(""TaxiRankId"");
    ";
    queueBookingCmd.ExecuteNonQuery();
    logger.LogInformation("QueueBookings table ensured");

    // Create QueueBookingPassengers table for rider passenger details
    using var queueBookingPassengersCmd = conn.CreateCommand();
    queueBookingPassengersCmd.CommandText = @"
        CREATE TABLE IF NOT EXISTS ""QueueBookingPassengers"" (
            ""Id"" UUID PRIMARY KEY,
            ""QueueBookingId"" UUID NOT NULL,
            ""Name"" TEXT NOT NULL,
            ""ContactNumber"" TEXT NOT NULL,
            ""Email"" TEXT,
            ""Destination"" TEXT,
            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_QueueBookingPassengers_QueueBookingId"" ON ""QueueBookingPassengers""(""QueueBookingId"");
    ";
    queueBookingPassengersCmd.ExecuteNonQuery();
    logger.LogInformation("QueueBookingPassengers table ensured");

    // Create Messages table for messaging system
    using var messagesCmd = conn.CreateCommand();
    messagesCmd.CommandText = @"
        CREATE TABLE IF NOT EXISTS ""Messages"" (
            ""Id""                  UUID PRIMARY KEY,
            ""SenderId""            UUID,
            ""SenderType""          TEXT NOT NULL DEFAULT 'User',
            ""SenderName""          TEXT,
            ""RecipientType""       TEXT NOT NULL DEFAULT 'User',
            ""RecipientId""         UUID,
            ""RecipientMarshalId""  UUID,
            ""RecipientDriverId""  UUID,
            ""TaxiRankId""          UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
            ""Subject""             TEXT NOT NULL,
            ""Content""             TEXT NOT NULL,
            ""MessageType""         TEXT NOT NULL DEFAULT 'Info',
            ""IsRead""              BOOLEAN NOT NULL DEFAULT FALSE,
            ""ReadAt""              TIMESTAMP WITH TIME ZONE,
            ""IsDeletedBySender""   BOOLEAN NOT NULL DEFAULT FALSE,
            ""IsDeletedByReceiver"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""CreatedAt""           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            ""UpdatedAt""           TIMESTAMP WITH TIME ZONE,
            ""ExpiresAt""           TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS ""IX_Messages_RecipientId"" ON ""Messages""(""RecipientId"");
        CREATE INDEX IF NOT EXISTS ""IX_Messages_RecipientMarshalId"" ON ""Messages""(""RecipientMarshalId"");
        CREATE INDEX IF NOT EXISTS ""IX_Messages_RecipientDriverId"" ON ""Messages""(""RecipientDriverId"");
        CREATE INDEX IF NOT EXISTS ""IX_Messages_TaxiRankId"" ON ""Messages""(""TaxiRankId"");
        CREATE INDEX IF NOT EXISTS ""IX_Messages_CreatedAt"" ON ""Messages""(""CreatedAt"");
    ";
    messagesCmd.ExecuteNonQuery();
    logger.LogInformation("Messages table ensured");

    // Patch DriverProfiles table with new license and PDP fields
    using var driverProfileCmd = conn.CreateCommand();
    driverProfileCmd.CommandText = @"
        ALTER TABLE ""DriverProfiles"" ADD COLUMN IF NOT EXISTS ""LicenseNumber"" TEXT;
        ALTER TABLE ""DriverProfiles"" ADD COLUMN IF NOT EXISTS ""LicenseExpiryDate"" TIMESTAMP WITH TIME ZONE;
        ALTER TABLE ""DriverProfiles"" ADD COLUMN IF NOT EXISTS ""PdpExpiryDate"" TIMESTAMP WITH TIME ZONE;
    ";
    driverProfileCmd.ExecuteNonQuery();
    logger.LogInformation("DriverProfiles columns patched");

    // Seed scheduled trips if none exist so riders can browse and book
    using var seedTripsCmd = conn.CreateCommand();
    seedTripsCmd.CommandText = @"
        DO $$ 
        DECLARE
            v_rank_id UUID;
            v_route1 UUID;
            v_route2 UUID;
            v_tenant UUID;
        BEGIN
            IF (SELECT COUNT(*) FROM ""ScheduledTrips"") = 0 THEN
                SELECT ""Id"" INTO v_rank_id FROM ""TaxiRanks"" LIMIT 1;
                IF v_rank_id IS NOT NULL THEN
                    SELECT ""Id"", ""TenantId"" INTO v_route1, v_tenant FROM ""Routes"" WHERE ""TaxiRankId"" = v_rank_id LIMIT 1;
                    SELECT ""Id"" INTO v_route2 FROM ""Routes"" WHERE ""TaxiRankId"" = v_rank_id AND ""Id"" != v_route1 LIMIT 1;
                    
                    IF v_route1 IS NOT NULL THEN
                        -- Create trips for today and next 3 days
                        FOR d IN 0..3 LOOP
                            INSERT INTO ""ScheduledTrips"" (""Id"", ""RouteId"", ""TaxiRankId"", ""TenantId"", ""ScheduledDate"", ""ScheduledTime"", ""Status"", ""CreatedAt"")
                            VALUES 
                                (gen_random_uuid(), v_route1, v_rank_id, COALESCE(v_tenant, '00000000-0000-0000-0000-000000000000'), CURRENT_DATE + d, '06:00:00', 'Scheduled', NOW()),
                                (gen_random_uuid(), v_route1, v_rank_id, COALESCE(v_tenant, '00000000-0000-0000-0000-000000000000'), CURRENT_DATE + d, '10:00:00', 'Scheduled', NOW()),
                                (gen_random_uuid(), v_route1, v_rank_id, COALESCE(v_tenant, '00000000-0000-0000-0000-000000000000'), CURRENT_DATE + d, '14:00:00', 'Scheduled', NOW());
                        END LOOP;
                        
                        IF v_route2 IS NOT NULL THEN
                            FOR d IN 0..3 LOOP
                                INSERT INTO ""ScheduledTrips"" (""Id"", ""RouteId"", ""TaxiRankId"", ""TenantId"", ""ScheduledDate"", ""ScheduledTime"", ""Status"", ""CreatedAt"")
                                VALUES 
                                    (gen_random_uuid(), v_route2, v_rank_id, COALESCE(v_tenant, '00000000-0000-0000-0000-000000000000'), CURRENT_DATE + d, '07:30:00', 'Scheduled', NOW()),
                                    (gen_random_uuid(), v_route2, v_rank_id, COALESCE(v_tenant, '00000000-0000-0000-0000-000000000000'), CURRENT_DATE + d, '12:00:00', 'Scheduled', NOW());
                            END LOOP;
                        END IF;
                    END IF;
                END IF;
            END IF;
        END $$;
    ";
    seedTripsCmd.ExecuteNonQuery();
    logger.LogInformation("Scheduled trips seeded");

    // Clean up: Keep only 1 trip for March 13 (06:00 DND to JHB)
    using var cleanupCmd = conn.CreateCommand();
    cleanupCmd.CommandText = @"
        DELETE FROM ""ScheduledTrips"" 
        WHERE ""ScheduledDate"" = '2026-03-13' 
        AND ""ScheduledTime"" IN ('07:30:00', '10:00:00', '12:00:00', '14:00:00');
    ";
    cleanupCmd.ExecuteNonQuery();
    logger.LogInformation("Cleaned up extra trips for March 13");
}
catch (Exception ex)
{
    logger.LogWarning(ex, "Failed to create taxi rank tables");
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseRouting();

// Add request logging middleware
app.Use(async (context, next) =>
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogInformation($"[Request] {context.Request.Method} {context.Request.Path}{context.Request.QueryString} from {context.Connection.RemoteIpAddress}");
    await next();
});

// CORS must be between routing and auth/endpoints
app.UseCors("AllowAngularApp");

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

// Ensure unhandled exceptions return a 500 response (and don't crash the host)
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Unhandled exception");
        if (!context.Response.HasStarted)
        {
            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            if (app.Environment.IsDevelopment())
            {
                await context.Response.WriteAsJsonAsync(new
                {
                    error = ex.Message,
                    innerException = ex.InnerException?.Message,
                    innerInnerException = ex.InnerException?.InnerException?.Message
                });
            }
            else
            {
                await context.Response.WriteAsJsonAsync(new { error = "Internal Server Error" });
            }
        }
    }
});

app.UseAuthentication();
app.UseAuthorization();

// Lightweight health-check endpoint (no auth required)
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }));

app.MapHub<QueueHub>("/queueHub");

app.MapControllers();

try
{
    logger.LogInformation("Starting application...");
    app.Run();
}
catch (Exception ex)
{
    logger.LogError(ex, "Application failed to start");
    throw;
}
        }
    }
}
