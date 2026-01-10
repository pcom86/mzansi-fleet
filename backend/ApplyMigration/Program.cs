using System;
using System.Threading.Tasks;
using Npgsql;

class Program
{
    static async Task<int> Main(string[] args)
    {
        var connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres";

        try
        {
            using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();
            Console.WriteLine("Connected to database successfully!");

            var sql = @"
    ALTER TABLE ""Trips"" ADD COLUMN IF NOT EXISTS ""PassengerListFileName"" text NULL;
    ALTER TABLE ""Trips"" ADD COLUMN IF NOT EXISTS ""PassengerListFileData"" text NULL;
    ";

            using var command = new NpgsqlCommand(sql, connection);
            await command.ExecuteNonQueryAsync();

            Console.WriteLine("Migration applied successfully!");
            Console.WriteLine("Added columns:");
            Console.WriteLine("  - PassengerListFileName (text, nullable)");
            Console.WriteLine("  - PassengerListFileData (text, nullable)");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            return 1;
        }

        return 0;
    }
}
