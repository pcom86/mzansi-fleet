using System;
using Microsoft.EntityFrameworkCore;
using MzansiFleet.Repository;

class Program
{
    static async Task Main(string[] args)
    {
        var connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres";

        var options = new DbContextOptionsBuilder<MzansiFleetDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        using var context = new MzansiFleetDbContext(options);

        try
        {
            Console.WriteLine("Applying migrations...");
            await context.Database.MigrateAsync();
            Console.WriteLine("Migrations applied successfully!");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error applying migrations: {ex.Message}");
        }
    }
}