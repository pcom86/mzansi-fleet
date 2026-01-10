using Npgsql;
using System;

class Program
{
    static int Main()
    {
        var connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres";

        try
        {
            using var conn = new NpgsqlConnection(connectionString);
            conn.Open();
            Console.WriteLine("✓ Connected to database");

            var sql = @"INSERT INTO ""Tenants"" (""Id"", ""Name"", ""ContactEmail"", ""ContactPhone"")
                        VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Default Tenant', 'admin@mzansifleet.com', '+27 11 000 0000')
                        ON CONFLICT (""Id"") DO NOTHING";
            
            using var cmd = new NpgsqlCommand(sql, conn);
            var rowsAffected = cmd.ExecuteNonQuery();
            
            if (rowsAffected > 0)
                Console.WriteLine("✓ Default tenant created successfully!");
            else
                Console.WriteLine("✓ Tenant already exists");
                
            return 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
            return 1;
        }
    }
}
