using System;
using System.Threading.Tasks;
using Npgsql;

var connectionString = "Host=localhost;Port=5432;Database=MzansiFleetDb;Username=postgres;Password=postgres";

Console.WriteLine("=== Update Tenant Types ===\n");

try
{
    await using var connection = new NpgsqlConnection(connectionString);
    await connection.OpenAsync();
    
    Console.WriteLine("Connected to database\n");
    
    // Update tenant types
    var updateSql = @"
        UPDATE ""Tenants""
        SET ""TenantType"" = 'Fleet Owner'
        WHERE ""Id"" != 'edfed825-c3e2-4384-99fe-3cb3acfa51af'
          AND ""TenantType"" = 'Taxi Association'
    ";
    
    await using var updateCmd = new NpgsqlCommand(updateSql, connection);
    var rowsAffected = await updateCmd.ExecuteNonQueryAsync();
    
    Console.WriteLine($"✓ Updated {rowsAffected} tenant(s) to 'Fleet Owner'\n");
    
    // Display all tenants
    var selectSql = @"SELECT ""Id"", ""Name"", ""TenantType"", ""Code"" FROM ""Tenants"" ORDER BY ""TenantType"", ""Name""";
    
    await using var selectCmd = new NpgsqlCommand(selectSql, connection);
    await using var reader = await selectCmd.ExecuteReaderAsync();
    
    Console.WriteLine("Current Tenants:");
    Console.WriteLine(new string('-', 100));
    Console.WriteLine($"{"ID",-40} {"Name",-30} {"Type",-20}");
    Console.WriteLine(new string('-', 100));
    
    while (await reader.ReadAsync())
    {
        var id = reader.GetGuid(0);
        var name = reader.GetString(1);
        var type = reader.GetString(2);
        
        Console.WriteLine($"{id,-40} {name,-30} {type,-20}");
    }
    
    Console.WriteLine("\n✓ Update completed successfully!");
}
catch (Exception ex)
{
    Console.WriteLine($"\n❌ Error: {ex.Message}");
    Environment.Exit(1);
}
