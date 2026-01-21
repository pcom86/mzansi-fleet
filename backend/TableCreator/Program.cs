using Npgsql;

var connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres";

var sql = @"
-- Make RouteId and DriverId nullable in Trips table to support rental trips
ALTER TABLE ""Trips"" ALTER COLUMN ""RouteId"" DROP NOT NULL;
ALTER TABLE ""Trips"" ALTER COLUMN ""DriverId"" DROP NOT NULL;";

try
{
    using var conn = new NpgsqlConnection(connectionString);
    conn.Open();
    Console.WriteLine("Connected to database...");
    
    using var cmd = new NpgsqlCommand(sql, conn);
    cmd.ExecuteNonQuery();
    
    Console.WriteLine("✓ Trip fields made nullable successfully!");
}
catch (Exception ex)
{
    Console.WriteLine($"Error: {ex.Message}");
}

