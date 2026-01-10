using System;
using System.Threading.Tasks;
using Npgsql;

var connectionString = "Host=localhost;Port=5432;Database=MzansiFleetDb;Username=postgres;Password=postgres";

Console.WriteLine("=== Check and Fix Taxi Rank Associations ===\n");

try
{
    await using var connection = new NpgsqlConnection(connectionString);
    await connection.OpenAsync();
    
    Console.WriteLine("Connected to database\n");
    
    // Get the Kangwane Swazi Taxi Association ID
    var tenantId = "edfed825-c3e2-4384-99fe-3cb3acfa51af";
    
    // Check existing associations
    var checkAssocSql = @"
        SELECT COUNT(*) 
        FROM ""TaxiRankAssociations"" 
        WHERE ""TenantId"" = @tenantId
    ";
    
    await using var checkCmd = new NpgsqlCommand(checkAssocSql, connection);
    checkCmd.Parameters.AddWithValue("@tenantId", Guid.Parse(tenantId));
    var assocCount = Convert.ToInt32(await checkCmd.ExecuteScalarAsync());
    
    Console.WriteLine($"Current associations for Kangwane Swazi: {assocCount}");
    
    // Get all taxi ranks
    var ranksSql = @"SELECT ""Id"", ""Name"", ""Code"", ""TenantId"" FROM ""TaxiRanks""";
    await using var ranksCmd = new NpgsqlCommand(ranksSql, connection);
    await using var reader = await ranksCmd.ExecuteReaderAsync();
    
    Console.WriteLine("\nTaxi Ranks in database:");
    Console.WriteLine(new string('-', 100));
    
    var ranksToAssociate = new System.Collections.Generic.List<(Guid id, string name, Guid tenantId)>();
    
    while (await reader.ReadAsync())
    {
        var rankId = reader.GetGuid(0);
        var name = reader.GetString(1);
        var code = reader.GetString(2);
        var rankTenantId = reader.GetGuid(3);
        
        Console.WriteLine($"Rank: {name} ({code}) - TenantId: {rankTenantId}");
        
        // If this rank's TenantId matches our association tenant, we should associate it
        if (rankTenantId.ToString() == tenantId)
        {
            ranksToAssociate.Add((rankId, name, rankTenantId));
        }
    }
    
    await reader.CloseAsync();
    
    if (ranksToAssociate.Count == 0)
    {
        Console.WriteLine("\n⚠️  No taxi ranks found with TenantId matching Kangwane Swazi Taxi Association");
        Console.WriteLine("You may need to update the TaxiRank.TenantId or create new ranks.");
    }
    else
    {
        Console.WriteLine($"\n✓ Found {ranksToAssociate.Count} taxi rank(s) to associate");
        
        // Add associations
        foreach (var (rankId, name, rankTenantId) in ranksToAssociate)
        {
            var insertSql = @"
                INSERT INTO ""TaxiRankAssociations"" (""Id"", ""TaxiRankId"", ""TenantId"", ""IsPrimary"", ""AssignedAt"", ""Notes"")
                VALUES (gen_random_uuid(), @rankId, @tenantId, true, CURRENT_TIMESTAMP, 'Added by fix script')
                ON CONFLICT (""TaxiRankId"", ""TenantId"") DO NOTHING
            ";
            
            await using var insertCmd = new NpgsqlCommand(insertSql, connection);
            insertCmd.Parameters.AddWithValue("@rankId", rankId);
            insertCmd.Parameters.AddWithValue("@tenantId", Guid.Parse(tenantId));
            
            await insertCmd.ExecuteNonQueryAsync();
            Console.WriteLine($"  ✓ Associated: {name}");
        }
        
        Console.WriteLine("\n✓ Associations created successfully!");
    }
    
    // Show final associations
    var finalCheckSql = @"
        SELECT 
            tra.""Id"",
            tr.""Name"" as rank_name,
            t.""Name"" as tenant_name,
            tra.""IsPrimary"",
            tra.""AssignedAt""
        FROM ""TaxiRankAssociations"" tra
        INNER JOIN ""TaxiRanks"" tr ON tra.""TaxiRankId"" = tr.""Id""
        INNER JOIN ""Tenants"" t ON tra.""TenantId"" = t.""Id""
        WHERE tra.""TenantId"" = @tenantId
    ";
    
    await using var finalCmd = new NpgsqlCommand(finalCheckSql, connection);
    finalCmd.Parameters.AddWithValue("@tenantId", Guid.Parse(tenantId));
    await using var finalReader = await finalCmd.ExecuteReaderAsync();
    
    Console.WriteLine("\n\nFinal Associations for Kangwane Swazi Taxi Association:");
    Console.WriteLine(new string('-', 100));
    
    var hasAssociations = false;
    while (await finalReader.ReadAsync())
    {
        hasAssociations = true;
        var rankName = finalReader.GetString(1);
        var tenantName = finalReader.GetString(2);
        var isPrimary = finalReader.GetBoolean(3);
        var assignedAt = finalReader.GetDateTime(4);
        
        Console.WriteLine($"{rankName} → {tenantName} (Primary: {isPrimary}, Assigned: {assignedAt:yyyy-MM-dd})");
    }
    
    if (!hasAssociations)
    {
        Console.WriteLine("⚠️  No associations found - frontend will show empty list");
    }
}
catch (Exception ex)
{
    Console.WriteLine($"\n❌ Error: {ex.Message}");
    Console.WriteLine(ex.StackTrace);
    Environment.Exit(1);
}
