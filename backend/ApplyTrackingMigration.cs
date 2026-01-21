using System;
using System.IO;
using Npgsql;

class Program
{
    static void Main(string[] args)
    {
        var connectionString = args.Length > 0 
            ? args[0] 
            : "Host=localhost;Port=5432;Database=mzansi_fleet_db;Username=postgres;Password=postgres";
        
        var sqlFile = Path.Combine(AppContext.BaseDirectory, "add-tracking-device-tables.sql");
        
        if (!File.Exists(sqlFile))
        {
            Console.WriteLine($"Error: SQL file not found at {sqlFile}");
            Environment.Exit(1);
        }
        
        Console.WriteLine("================================================");
        Console.WriteLine("  Tracking Device Tables Migration");
        Console.WriteLine("================================================");
        Console.WriteLine();
        Console.WriteLine("Reading SQL file...");
        
        var sql = File.ReadAllText(sqlFile);
        
        Console.WriteLine("Connecting to database...");
        Console.WriteLine($"Connection: {connectionString.Split(';')[0]}");
        Console.WriteLine();
        
        try
        {
            using var connection = new NpgsqlConnection(connectionString);
            connection.Open();
            
            Console.WriteLine("Executing migration...");
            using var command = new NpgsqlCommand(sql, connection);
            command.ExecuteNonQuery();
            
            Console.WriteLine();
            Console.WriteLine("✓ Migration completed successfully!");
            Console.WriteLine();
            Console.WriteLine("Created tables:");
            Console.WriteLine("  - TrackingDeviceRequests");
            Console.WriteLine("  - TrackingDeviceOffers");
            Console.WriteLine();
            
            // Verify tables
            var verifyQuery = @"
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('TrackingDeviceRequests', 'TrackingDeviceOffers')";
            
            using var verifyCommand = new NpgsqlCommand(verifyQuery, connection);
            using var reader = verifyCommand.ExecuteReader();
            
            Console.WriteLine("Verified tables:");
            while (reader.Read())
            {
                Console.WriteLine($"  ✓ {reader.GetString(0)}");
            }
            
            Console.WriteLine();
            Console.WriteLine("================================================");
            Console.WriteLine("Migration completed successfully!");
            Console.WriteLine("================================================");
        }
        catch (Exception ex)
        {
            Console.WriteLine();
            Console.WriteLine("✗ Error executing migration!");
            Console.WriteLine(ex.Message);
            Environment.Exit(1);
        }
    }
}
