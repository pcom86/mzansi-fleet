using System;
using Npgsql;

var connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres";

using var connection = new NpgsqlConnection(connectionString);
connection.Open();

var routeId = "3d9c0767-51a2-47ad-9561-37d2b092beaf";
var taxiRankId = "76afaa8c-6fde-46b5-a9a9-e3559943b681";

var updateCommand = new NpgsqlCommand(
    @"UPDATE ""Routes"" 
      SET ""TaxiRankId"" = @taxiRankId 
      WHERE ""Id"" = @routeId",
    connection);

updateCommand.Parameters.AddWithValue("taxiRankId", Guid.Parse(taxiRankId));
updateCommand.Parameters.AddWithValue("routeId", Guid.Parse(routeId));

var rowsAffected = updateCommand.ExecuteNonQuery();

Console.WriteLine($"Updated {rowsAffected} route(s) with TaxiRankId");

// Verify the update
var selectCommand = new NpgsqlCommand(
    @"SELECT ""Id"", ""Name"", ""TaxiRankId"", ""TenantId"" 
      FROM ""Routes"" 
      WHERE ""Id"" = @routeId",
    connection);

selectCommand.Parameters.AddWithValue("routeId", Guid.Parse(routeId));

using var reader = selectCommand.ExecuteReader();
if (reader.Read())
{
    Console.WriteLine($"\nVerified Route:");
    Console.WriteLine($"  ID: {reader["Id"]}");
    Console.WriteLine($"  Name: {reader["Name"]}");
    Console.WriteLine($"  TaxiRankId: {reader["TaxiRankId"]}");
    Console.WriteLine($"  TenantId: {reader["TenantId"]}");
}

connection.Close();
Console.WriteLine("\nRoute update completed successfully!");
