using Microsoft.EntityFrameworkCore;
using MzansiFleet.Application.Handlers;
using MzansiFleet.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MzansiFleet.Repository;

namespace MzansiFleet.Api
{
    public class Startup
    {
        public IConfiguration Configuration { get; }
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddDbContext<MzansiFleetDbContext>(options =>
                options.UseNpgsql(Configuration.GetConnectionString("DefaultConnection")));
            services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.IVehicleRepository, MzansiFleet.Repository.Repositories.VehicleRepository>();
            services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.IServiceProviderRepository, MzansiFleet.Repository.Repositories.ServiceProviderRepository>();
            services.AddScoped<MzansiFleet.Domain.Interfaces.IRepositories.IServiceProviderProfileRepository, MzansiFleet.Repository.Repositories.ServiceProviderProfileRepository>();
            
            // Register services
            services.AddScoped<VehicleNotificationService>();
            
            // Register command handlers
            services.AddScoped<CreateVehicleCommandHandler>();
            services.AddScoped<LoginCommandHandler>();
            services.AddScoped<LogoutCommandHandler>();
            
            // Register query handlers
            services.AddScoped<GetVehiclesForTenantQueryHandler>();
            // ...existing code...
        }
        // ...existing code...
    }
}
