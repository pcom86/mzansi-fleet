using System;
using Npgsql;

var connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres";

Console.WriteLine("Recreating RentalOffers and VehicleRentalBookings tables...");

// Drop and recreate tables to ensure correct schema
var dropTables = @"
DROP TABLE IF EXISTS ""VehicleRentalBookings"" CASCADE;
DROP TABLE IF EXISTS ""RentalOffers"" CASCADE;
";

var createOffers = @"
CREATE TABLE ""RentalOffers"" (
    ""Id"" uuid PRIMARY KEY,
    ""RentalRequestId"" uuid NOT NULL,
    ""OwnerId"" uuid NOT NULL,
    ""VehicleId"" uuid NOT NULL,
    ""PricePerDay"" numeric(18,2) NOT NULL,
    ""TotalPrice"" numeric(18,2) NOT NULL,
    ""OfferMessage"" text NOT NULL DEFAULT '',
    ""TermsAndConditions"" text NOT NULL DEFAULT '',
    ""IncludesDriver"" boolean NOT NULL DEFAULT false,
    ""DriverFee"" numeric(18,2),
    ""IncludesInsurance"" boolean NOT NULL DEFAULT false,
    ""SecurityDeposit"" numeric(18,2),
    ""Status"" text NOT NULL DEFAULT 'Pending',
    ""SubmittedAt"" timestamp without time zone NOT NULL DEFAULT NOW(),
    ""ResponsedAt"" timestamp without time zone
);";

var createBookings = @"
CREATE TABLE ""VehicleRentalBookings"" (
    ""Id"" uuid PRIMARY KEY,
    ""RentalRequestId"" uuid NOT NULL,
    ""RentalOfferId"" uuid NOT NULL,
    ""RenterId"" uuid NOT NULL,
    ""OwnerId"" uuid NOT NULL,
    ""VehicleId"" uuid NOT NULL,
    ""StartDate"" timestamp without time zone NOT NULL,
    ""EndDate"" timestamp without time zone NOT NULL,
    ""DurationDays"" integer NOT NULL,
    ""TotalAmount"" numeric(18,2) NOT NULL,
    ""PickupLocation"" text NOT NULL DEFAULT '',
    ""DropoffLocation"" text NOT NULL DEFAULT '',
    ""Status"" text NOT NULL DEFAULT 'Confirmed',
    ""BookedAt"" timestamp without time zone NOT NULL DEFAULT NOW(),
    ""StartedAt"" timestamp without time zone,
    ""CompletedAt"" timestamp without time zone,
    ""CancellationReason"" text,
    ""CancelledAt"" timestamp without time zone
);";

try
{
    using var connection = new NpgsqlConnection(connectionString);
    connection.Open();
    Console.WriteLine("Connected to database");
    
    // Drop existing tables
    using (var cmd = new NpgsqlCommand(dropTables, connection))
    {
        cmd.ExecuteNonQuery();
        Console.WriteLine("Dropped existing tables");
    }
    
    // Create RentalOffers table
    using (var cmd = new NpgsqlCommand(createOffers, connection))
    {
        cmd.ExecuteNonQuery();
        Console.WriteLine("RentalOffers table created");
    }
    
    // Create VehicleRentalBookings table
    using (var cmd = new NpgsqlCommand(createBookings, connection))
    {
        cmd.ExecuteNonQuery();
        Console.WriteLine("VehicleRentalBookings table created");
    }
    
    Console.WriteLine("Migration completed successfully!");
}
catch (Exception ex)
{
    Console.WriteLine($"ERROR: {ex.Message}");
    Console.WriteLine(ex.StackTrace);
    return 1;
}

return 0;
