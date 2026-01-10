using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using MzansiFleet.Repository;
using MzansiFleet.Repository.Repositories;
using MzansiFleet.Application.Handlers;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:4200")
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
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

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

app.UseSwagger();
app.UseSwaggerUI();

// CORS must be before Authorization and MapControllers
app.UseCors("AllowAngularApp");

app.UseAuthorization();
app.MapControllers();
app.Run();
