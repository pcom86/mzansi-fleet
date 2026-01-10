using System;
using Npgsql;

class Program
{
    static void Main(string[] args)
    {
        var connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres";
        
        using var connection = new NpgsqlConnection(connectionString);
        try
        {
            connection.Open();
            Console.WriteLine("✓ Connected to database successfully!");

            // Check if column exists
            var checkSql = @"
                SELECT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'MaintenanceHistories' 
                    AND column_name = 'ServiceProviderRating'
                );";

            using (var checkCmd = new NpgsqlCommand(checkSql, connection))
            {
                var exists = (bool)checkCmd.ExecuteScalar();
                
                if (exists)
                {
                    Console.WriteLine("✓ ServiceProviderRating column already exists in MaintenanceHistories table");
                    return;
                }
            }

            // Add the column
            var alterSql = @"ALTER TABLE ""MaintenanceHistories"" ADD COLUMN ""ServiceProviderRating"" INTEGER NULL;";
            
            using (var alterCmd = new NpgsqlCommand(alterSql, connection))
            {
                alterCmd.ExecuteNonQuery();
                Console.WriteLine("✓ ServiceProviderRating column added successfully!");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error: {ex.Message}");
            Environment.Exit(1);
        }
    }
}
