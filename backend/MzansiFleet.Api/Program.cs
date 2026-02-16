using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using MzansiFleet.Repository;
using MzansiFleet.Repository.Repositories;
using MzansiFleet.Application.Handlers;
using System.Text.Json;
using System;
using MzansiFleet.Api;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore.Diagnostics;

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
            policy.WithOrigins("http://localhost:4200", "http://localhost:4201", "http://localhost:4202", "http://localhost:4203")
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
    });
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

// Register Taxi Rank repositories
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.ITaxiRankRepository, MzansiFleet.Repository.Repositories.TaxiRankRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.ITaxiRankTripRepository, MzansiFleet.Repository.Repositories.TaxiRankTripRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.ITripPassengerRepository, MzansiFleet.Repository.Repositories.TripPassengerRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.ITripCostRepository, MzansiFleet.Repository.Repositories.TripCostRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.ITaxiMarshalRepository, MzansiFleet.Repository.Repositories.TaxiMarshalRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.ITaxiRankAdminRepository, MzansiFleet.Repository.Repositories.TaxiRankAdminRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.IVehicleTaxiRankRepository, MzansiFleet.Repository.Repositories.VehicleTaxiRankRepository>();
builder.Services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.ITripScheduleRepository, MzansiFleet.Repository.Repositories.TripScheduleRepository>();

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
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

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
}
catch (Exception ex)
{
    logger.LogWarning(ex, "Failed to apply database migrations, but continuing startup");
}

// Create taxi rank tables manually
try
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    MigrationRunner.CreateTaxiRankTables(connectionString);
    logger.LogInformation("Taxi rank tables created successfully");
}
catch (Exception ex)
{
    logger.LogWarning(ex, "Failed to create taxi rank tables");
}

app.UseSwagger();
app.UseSwaggerUI();

// CORS must be before Authorization and MapControllers
app.UseCors("AllowAngularApp");

app.UseAuthentication();
app.UseAuthorization();
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
