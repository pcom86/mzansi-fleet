using System;
using System.IO;
using Npgsql;

class Program
{
    static void Main(string[] args)
    {
        var connectionString = args.Length > 0 
            ? args[0] 
            : "Host=localhost;Port=5432;Database=MzansiFleetDb;Username=postgres;Password=postgres";
        
        // SQL file can be passed as second argument, otherwise default to tracking device tables
        string sqlFile;
        if (args.Length > 1)
        {
            sqlFile = Path.IsPathRooted(args[1]) 
                ? args[1] 
                : Path.Combine(Directory.GetParent(AppContext.BaseDirectory)!.Parent!.Parent!.Parent!.Parent!.FullName, args[1]);
        }
        else
        {
            sqlFile = Path.Combine(Directory.GetParent(AppContext.BaseDirectory)!.Parent!.Parent!.Parent!.Parent!.FullName, "add-tracking-device-tables.sql");
        }
        
        if (!File.Exists(sqlFile))
        {
            Console.WriteLine($"Error: SQL file not found at {sqlFile}");
            Environment.Exit(1);
        }
        
        Console.WriteLine("================================================");
        Console.WriteLine("  Database Migration Tool");
        Console.WriteLine("================================================");
        Console.WriteLine();
        Console.WriteLine($"SQL File: {Path.GetFileName(sqlFile)}");
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
            Console.WriteLine("Migration completed successfully!");
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
            Console.WriteLine("Error executing migration!");
            Console.WriteLine(ex.Message);
            if (ex.InnerException != null)
            {
                Console.WriteLine("Inner exception: " + ex.InnerException.Message);
            }
            Environment.Exit(1);
        }
    }
}
