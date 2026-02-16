Add-Type -Path "C:\Users\pmaseko\.nuget\packages\npgsql\10.0.1\lib\net8.0\Npgsql.dll"

$connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres"

try {
    $connection = New-Object Npgsql.NpgsqlConnection($connectionString)
    $connection.Open()

    $sql = @"
CREATE TABLE IF NOT EXISTS "DailyTaxiQueues" (
    "Id" uuid NOT NULL,
    "TaxiRankId" uuid NOT NULL,
    "VehicleId" uuid NOT NULL,
    "DriverId" uuid NULL,
    "TenantId" uuid NOT NULL,
    "QueueDate" timestamp with time zone NOT NULL,
    "AvailableFrom" interval NOT NULL,
    "AvailableUntil" interval NULL,
    "Priority" integer NOT NULL DEFAULT 1,
    "Status" text NOT NULL DEFAULT 'Available',
    "AssignedTripId" uuid NULL,
    "AssignedAt" timestamp with time zone NULL,
    "AssignedByUserId" uuid NULL,
    "Notes" text NULL,
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
    "UpdatedAt" timestamp with time zone NULL,
    CONSTRAINT "PK_DailyTaxiQueues" PRIMARY KEY ("Id")
);
"@

    $command = $connection.CreateCommand()
    $command.CommandText = $sql
    $command.ExecuteNonQuery()

    Write-Host "DailyTaxiQueues table created successfully!"

    $connection.Close()
}
catch {
    Write-Host "Error: $($_.Exception.Message)"
}