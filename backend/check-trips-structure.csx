#r "nuget: Npgsql, 9.0.3"

using Npgsql;
using System;
using System.Threading.Tasks;

await Main();

async Task Main()
{
    var connectionString = "Host=localhost;Port=5432;Database=MzansiFleet;Username=postgres;Password=postgres";

    Console.WriteLine("Checking Trips table structure...");
    Console.WriteLine();

    await using var connection = new NpgsqlConnection(connectionString);
    await connection.OpenAsync();

    var query = @"
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Trips'
ORDER BY ordinal_position;
";

    await using var command = new NpgsqlCommand(query, connection);
    await using var reader = await command.ExecuteReaderAsync();

    bool hasTenantId = false;
    Console.WriteLine("Columns in Trips table:");
    Console.WriteLine("----------------------------------------");

    while (await reader.ReadAsync())
    {
        var columnName = reader.GetString(0);
        var dataType = reader.GetString(1);
        var isNullable = reader.GetString(2);
        
        Console.WriteLine($"{columnName} - {dataType} (Nullable: {isNullable})");
        
        if (columnName == "TenantId")
        {
            hasTenantId = true;
        }
    }

    Console.WriteLine();
    Console.WriteLine("----------------------------------------");
    if (hasTenantId)
    {
        Console.WriteLine("✓ TenantId column EXISTS in Trips table");
    }
    else
    {
        Console.WriteLine("✗ TenantId column DOES NOT EXIST in Trips table");
        Console.WriteLine();
        Console.WriteLine("ISSUE FOUND:");
        Console.WriteLine("The Trips table is missing a TenantId column!");
        Console.WriteLine("This means trips cannot be directly filtered by tenant.");
        Console.WriteLine();
        Console.WriteLine("Current workaround:");
        Console.WriteLine("- Trips are filtered through Vehicle → TenantId relationship");
        Console.WriteLine("- This requires vehicles to have correct TenantId values");
        Console.WriteLine();
        Console.WriteLine("Checking if vehicles have TenantId...");
    }
    Console.WriteLine("----------------------------------------");

    await reader.CloseAsync();

    // Also check if vehicles have TenantId
    var vehicleQuery = @"
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'Vehicles' AND column_name = 'TenantId';
";

    await using var vehicleCommand = new NpgsqlCommand(vehicleQuery, connection);
    var vehicleResult = await vehicleCommand.ExecuteScalarAsync();

    Console.WriteLine();
    if (vehicleResult != null)
    {
        Console.WriteLine("✓ Vehicles table HAS TenantId column");
        Console.WriteLine("  → Trips CAN be filtered by tenant through Vehicle relationship");
        
        // Check if there are any trips and vehicles
        var statsQuery = @"
        SELECT 
            (SELECT COUNT(*) FROM ""Trips"") as trip_count,
            (SELECT COUNT(*) FROM ""Vehicles"") as vehicle_count,
            (SELECT COUNT(*) FROM ""Vehicles"" WHERE ""TenantId"" IS NOT NULL) as vehicles_with_tenant;
    ";
        
        await using var statsCommand = new NpgsqlCommand(statsQuery, connection);
        await using var statsReader = await statsCommand.ExecuteReaderAsync();
        
        if (await statsReader.ReadAsync())
        {
            Console.WriteLine();
            Console.WriteLine("Database Statistics:");
            Console.WriteLine($"- Total Trips: {statsReader.GetInt64(0)}");
            Console.WriteLine($"- Total Vehicles: {statsReader.GetInt64(1)}");
            Console.WriteLine($"- Vehicles with TenantId: {statsReader.GetInt64(2)}");
        }
    }
    else
    {
        Console.WriteLine("✗ Vehicles table DOES NOT HAVE TenantId column");
        Console.WriteLine("  → CRITICAL: Cannot filter trips by tenant at all!");
    }

    Console.WriteLine();
    Console.WriteLine("Check complete.");
}
