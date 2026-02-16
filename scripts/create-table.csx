#!/usr/bin/env dotnet-script

#r "nuget: Npgsql, 9.0.0"

using Npgsql;

var connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres";

try
{
    using var connection = new NpgsqlConnection(connectionString);
    await connection.OpenAsync();

    var sql = @"
CREATE TABLE IF NOT EXISTS ""DailyTaxiQueues"" (
    ""Id"" uuid NOT NULL,
    ""TaxiRankId"" uuid NOT NULL,
    ""VehicleId"" uuid NOT NULL,
    ""DriverId"" uuid NULL,
    ""TenantId"" uuid NOT NULL,
    ""QueueDate"" timestamp with time zone NOT NULL,
    ""AvailableFrom"" interval NOT NULL,
    ""AvailableUntil"" interval NULL,
    ""Priority"" integer NOT NULL DEFAULT 1,
    ""Status"" text NOT NULL DEFAULT 'Available',
    ""AssignedTripId"" uuid NULL,
    ""AssignedAt"" timestamp with time zone NULL,
    ""AssignedByUserId"" uuid NULL,
    ""Notes"" text NULL,
    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""UpdatedAt"" timestamp with time zone NULL,
    CONSTRAINT ""PK_DailyTaxiQueues"" PRIMARY KEY (""Id"")
);
";

    using var command = new NpgsqlCommand(sql, connection);
    await command.ExecuteNonQueryAsync();

    Console.WriteLine("DailyTaxiQueues table created successfully!");
}
catch (Exception ex)
{
    Console.WriteLine($"Error: {ex.Message}");
}