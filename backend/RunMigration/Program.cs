using System;
using Npgsql;

var connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres";

Console.WriteLine("Adding missing columns to VehicleRentalRequests...");

var sql = @"
-- Fix VehicleRentalRequests table
ALTER TABLE ""VehicleRentalRequests"" ADD COLUMN IF NOT EXISTS ""BudgetMin"" numeric(18,2);
ALTER TABLE ""VehicleRentalRequests"" ADD COLUMN IF NOT EXISTS ""BudgetMax"" numeric(18,2);
ALTER TABLE ""VehicleRentalRequests"" ADD COLUMN IF NOT EXISTS ""SeatingCapacity"" integer;
ALTER TABLE ""VehicleRentalRequests"" ADD COLUMN IF NOT EXISTS ""DurationDays"" integer;
ALTER TABLE ""VehicleRentalRequests"" ADD COLUMN IF NOT EXISTS ""TripPurpose"" text;
ALTER TABLE ""VehicleRentalRequests"" ADD COLUMN IF NOT EXISTS ""SpecialRequirements"" text;
ALTER TABLE ""VehicleRentalRequests"" ADD COLUMN IF NOT EXISTS ""ClosedAt"" timestamp without time zone;

-- Drop old columns that conflict with the new schema
ALTER TABLE ""VehicleRentalRequests"" DROP COLUMN IF EXISTS ""MinCapacity"";
ALTER TABLE ""VehicleRentalRequests"" DROP COLUMN IF EXISTS ""Budget"";
ALTER TABLE ""VehicleRentalRequests"" DROP COLUMN IF EXISTS ""AdditionalRequirements"";
ALTER TABLE ""VehicleRentalRequests"" DROP COLUMN IF EXISTS ""UpdatedAt"";
";

try
{
    using var connection = new NpgsqlConnection(connectionString);
    connection.Open();
    Console.WriteLine("Connected to database");
    
    using var command = new NpgsqlCommand(sql, connection);
    var affected = command.ExecuteNonQuery();
    
    Console.WriteLine($"Migration completed! {affected} statements executed.");
}
catch (Exception ex)
{
    Console.WriteLine($"ERROR: {ex.Message}");
    Console.WriteLine(ex.StackTrace);
    return 1;
}

return 0;
