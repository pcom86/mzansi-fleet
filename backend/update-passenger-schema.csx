using System;
using Npgsql;

var connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgresspass";

try
{
    using var connection = new NpgsqlConnection(connectionString);
    connection.Open();
    Console.WriteLine("Connected to database successfully!");

    var sql = @"
        ALTER TABLE ""Passengers"" ADD COLUMN IF NOT EXISTS ""NextOfKin"" TEXT NULL;
        ALTER TABLE ""Passengers"" ADD COLUMN IF NOT EXISTS ""NextOfKinContact"" TEXT NULL;
        ALTER TABLE ""Passengers"" ADD COLUMN IF NOT EXISTS ""Address"" TEXT NULL;
        ALTER TABLE ""Passengers"" ADD COLUMN IF NOT EXISTS ""Destination"" TEXT NULL;
    ";

    using var command = new NpgsqlCommand(sql, connection);
    command.ExecuteNonQuery();

    Console.WriteLine("✓ Migration completed successfully!");
    Console.WriteLine("Added columns: NextOfKin, NextOfKinContact, Address, Destination");
}
catch (Exception ex)
{
    Console.WriteLine($"Error: {ex.Message}");
    return 1;
}

return 0;
