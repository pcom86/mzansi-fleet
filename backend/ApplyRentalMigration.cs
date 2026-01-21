using System;
using System.Data;
using Npgsql;

var connectionString = "Host=localhost;Database=MzansiFleet;Username=postgres;Password=Tenda@2024";

Console.WriteLine("Applying Vehicle Rental Marketplace Migration...");

var sql = @"
ALTER TABLE ""VehicleRentalRequests"" ADD COLUMN IF NOT EXISTS ""BudgetMin"" numeric(18,2);
ALTER TABLE ""VehicleRentalRequests"" ADD COLUMN IF NOT EXISTS ""BudgetMax"" numeric(18,2);
ALTER TABLE ""VehicleRentalRequests"" ADD COLUMN IF NOT EXISTS ""SeatingCapacity"" integer;
ALTER TABLE ""VehicleRentalRequests"" ADD COLUMN IF NOT EXISTS ""DurationDays"" integer;
ALTER TABLE ""VehicleRentalRequests"" ADD COLUMN IF NOT EXISTS ""TripPurpose"" text;
ALTER TABLE ""VehicleRentalRequests"" ADD COLUMN IF NOT EXISTS ""SpecialRequirements"" text;
ALTER TABLE ""VehicleRentalRequests"" ADD COLUMN IF NOT EXISTS ""ClosedAt"" timestamp without time zone;
";

try
{
    using var connection = new NpgsqlConnection(connectionString);
    connection.Open();
    Console.WriteLine("Connected to database");
    
    using var command = new NpgsqlCommand(sql, connection);
    command.ExecuteNonQuery();
    
    Console.WriteLine("Migration applied successfully!");
}
catch (Exception ex)
{
    Console.WriteLine($"Error: {ex.Message}");
    return 1;
}

return 0;
