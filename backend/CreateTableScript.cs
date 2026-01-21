using System;
using Npgsql;

class Program
{
    static void Main()
    {
        var connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=Tenda@2024";
        
        var sql = @"
-- Create VehicleEarningRecords table if it doesn't exist
CREATE TABLE IF NOT EXISTS ""VehicleEarningRecords"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""VehicleId"" uuid NOT NULL,
    ""TripId"" uuid,
    ""Amount"" numeric NOT NULL,
    ""Date"" timestamp with time zone NOT NULL,
    ""Description"" text NOT NULL DEFAULT '',
    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc'),
    CONSTRAINT ""FK_VehicleEarningRecords_Vehicles_VehicleId"" FOREIGN KEY (""VehicleId"") REFERENCES ""Vehicles""(""Id"") ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS ""IX_VehicleEarningRecords_VehicleId"" ON ""VehicleEarningRecords"" (""VehicleId"");
CREATE INDEX IF NOT EXISTS ""IX_VehicleEarningRecords_TripId"" ON ""VehicleEarningRecords"" (""TripId"");
CREATE INDEX IF NOT EXISTS ""IX_VehicleEarningRecords_Date"" ON ""VehicleEarningRecords"" (""Date"");";
        
        try
        {
            using var conn = new NpgsqlConnection(connectionString);
            conn.Open();
            Console.WriteLine("Connected to database...");
            
            using var cmd = new NpgsqlCommand(sql, conn);
            cmd.ExecuteNonQuery();
            
            Console.WriteLine("✓ VehicleEarningRecords table created successfully!");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
        }
    }
}
