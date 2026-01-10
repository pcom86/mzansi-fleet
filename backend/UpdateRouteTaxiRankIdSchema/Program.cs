using System;
using Npgsql;

var connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres";

using var connection = new NpgsqlConnection(connectionString);
connection.Open();

Console.WriteLine("Adding TaxiRankId column to Routes table...");

// Add TaxiRankId column
var addColumnCommand = new NpgsqlCommand(
    @"ALTER TABLE ""Routes"" 
      ADD COLUMN IF NOT EXISTS ""TaxiRankId"" UUID",
    connection);

addColumnCommand.ExecuteNonQuery();
Console.WriteLine("✓ TaxiRankId column added");

// Add foreign key constraint
var addFkCommand = new NpgsqlCommand(
    @"DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_Routes_TaxiRanks_TaxiRankId'
        ) THEN
          ALTER TABLE ""Routes""
          ADD CONSTRAINT ""FK_Routes_TaxiRanks_TaxiRankId"" 
          FOREIGN KEY (""TaxiRankId"") 
          REFERENCES ""TaxiRanks""(""Id"") 
          ON DELETE SET NULL;
        END IF;
      END $$",
    connection);

addFkCommand.ExecuteNonQuery();
Console.WriteLine("✓ Foreign key constraint added");

// Create index
var createIndexCommand = new NpgsqlCommand(
    @"CREATE INDEX IF NOT EXISTS ""IX_Routes_TaxiRankId"" 
      ON ""Routes"" (""TaxiRankId"")",
    connection);

createIndexCommand.ExecuteNonQuery();
Console.WriteLine("✓ Index created");

// Now update the existing route with the taxi rank ID
Console.WriteLine("\nUpdating existing route with TaxiRankId...");

var updateCommand = new NpgsqlCommand(
    @"UPDATE ""Routes"" 
      SET ""TaxiRankId"" = @taxiRankId 
      WHERE ""Id"" = @routeId",
    connection);

updateCommand.Parameters.AddWithValue("taxiRankId", Guid.Parse("76afaa8c-6fde-46b5-a9a9-e3559943b681"));
updateCommand.Parameters.AddWithValue("routeId", Guid.Parse("3d9c0767-51a2-47ad-9561-37d2b092beaf"));

var rowsAffected = updateCommand.ExecuteNonQuery();
Console.WriteLine($"✓ Updated {rowsAffected} route(s)");

// Verify the changes
Console.WriteLine("\nVerifying Routes table:");
var selectCommand = new NpgsqlCommand(
    @"SELECT ""Id"", ""Name"", ""TaxiRankId"", ""TenantId"" 
      FROM ""Routes""",
    connection);

using var reader = selectCommand.ExecuteReader();
while (reader.Read())
{
    Console.WriteLine($"\nRoute: {reader["Name"]}");
    Console.WriteLine($"  ID: {reader["Id"]}");
    Console.WriteLine($"  TaxiRankId: {reader["TaxiRankId"]}");
    Console.WriteLine($"  TenantId: {reader["TenantId"]}");
}

connection.Close();
Console.WriteLine("\n✓ Schema migration completed successfully!");
