using System;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.IO;

class Program
{
    static void Main(string[] args)
    {
        string connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres";
        string sqlScriptPath = "complete-all-trips.sql";

        Console.WriteLine("Running SQL script to complete all active trips...");

        try
        {
            // Read SQL script
            string sqlScript = File.ReadAllText(sqlScriptPath);

            // Create connection and execute
            using (var conn = new NpgsqlConnection(connectionString))
            {
                conn.Open();

                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = sqlScript;
                    int rowsAffected = cmd.ExecuteNonQuery();
                    Console.WriteLine($"Script executed successfully. Rows affected: {rowsAffected}");
                }

                // Verify completed trips count
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT COUNT(*) FROM \"TaxiRankTrips\" WHERE \"Status\" = 'Completed'";
                    long completedCount = (long)cmd.ExecuteScalar();
                    Console.WriteLine($"Total completed trips: {completedCount}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error executing script: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            Environment.Exit(1);
        }
    }
}
