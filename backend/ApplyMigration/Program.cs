using System;
using System.IO;
using System.Threading.Tasks;
using Npgsql;

class Program
{
    static async Task<int> Main(string[] args)
    {
        var connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres";
        var sqlFilePath = args.Length > 0 ? args[0] : "../Migrations/20260115_AddTenderTables.sql";

        try
        {
            Console.WriteLine($"Reading migration file: {sqlFilePath}");
            var sqlScript = await File.ReadAllTextAsync(sqlFilePath);
            
            Console.WriteLine("Connecting to database...");
            using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();
            
            Console.WriteLine("Executing migration...");
            using var command = new NpgsqlCommand(sqlScript, connection);
            var result = await command.ExecuteNonQueryAsync();
            
            Console.WriteLine("✓ Tender tables migration applied successfully!");
            Console.WriteLine($"Migration completed: {result} operations executed");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"✗ Error applying migration: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
            return 1;
        }

        return 0;
    }
}
