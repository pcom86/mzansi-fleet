using Npgsql;

var connString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres";

await using var conn = new NpgsqlConnection(connString);
await conn.OpenAsync();

Console.WriteLine("=== Query Taxi Ranks for Kangwane Swazi Tenant ===\n");

// Query using the many-to-many join (what the API does)
const string query = @"
    SELECT 
        tr.""Id"",
        tr.""Name"",
        tr.""Code"",
        tr.""Status"",
        tr.""TenantId"",
        tra.""IsPrimary"",
        tra.""AssignedAt""
    FROM ""TaxiRankAssociations"" tra
    INNER JOIN ""TaxiRanks"" tr ON tra.""TaxiRankId"" = tr.""Id""
    WHERE tra.""TenantId"" = @tenantId
    ORDER BY tr.""Name""";

await using (var cmd = new NpgsqlCommand(query, conn))
{
    cmd.Parameters.AddWithValue("@tenantId", Guid.Parse("edfed825-c3e2-4384-99fe-3cb3acfa51af"));
    await using var reader = await cmd.ExecuteReaderAsync();

    if (!reader.HasRows)
    {
        Console.WriteLine("❌ No taxi ranks found!");
    }
    else
    {
        while (await reader.ReadAsync())
        {
            Console.WriteLine($"Found Rank:");
            Console.WriteLine($"  ID: {reader.GetGuid(0)}");
            Console.WriteLine($"  Name: {reader.GetString(1)}");
            Console.WriteLine($"  Code: {reader.GetString(2)}");
            Console.WriteLine($"  Status: {reader.GetString(3)}");
            Console.WriteLine($"  TenantId: {reader.GetGuid(4)}");
            Console.WriteLine($"  IsPrimary: {reader.GetBoolean(5)}");
            Console.WriteLine($"  AssignedAt: {reader.GetDateTime(6):yyyy-MM-dd}");
            Console.WriteLine();
        }
    }
}

Console.WriteLine("\n✓ Query complete!");
