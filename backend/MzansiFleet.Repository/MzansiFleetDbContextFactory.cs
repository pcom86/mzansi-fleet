using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace MzansiFleet.Repository
{
    public class MzansiFleetDbContextFactory : IDesignTimeDbContextFactory<MzansiFleetDbContext>
    {
        public MzansiFleetDbContext CreateDbContext(string[] args)
        {
            // Try to find appsettings.json in both possible locations
            var basePath = Directory.GetCurrentDirectory();
            var apiSettings = Path.Combine(basePath, "MzansiFleet.Api", "appsettings.json");
            var rootSettings = Path.Combine(basePath, "appsettings.json");

            var configBuilder = new ConfigurationBuilder();

            if (File.Exists(apiSettings))
                configBuilder.AddJsonFile(apiSettings, optional: false, reloadOnChange: true);
            else if (File.Exists(rootSettings))
                configBuilder.AddJsonFile(rootSettings, optional: false, reloadOnChange: true);
            else
                throw new FileNotFoundException("Could not find appsettings.json for EF Core design-time services.");

            var configuration = configBuilder.Build();

            var optionsBuilder = new DbContextOptionsBuilder<MzansiFleetDbContext>();
            optionsBuilder.UseNpgsql(
                configuration.GetConnectionString("DefaultConnection") ?? string.Empty
            );

            return new MzansiFleetDbContext(optionsBuilder.Options);
        }
    }
}
