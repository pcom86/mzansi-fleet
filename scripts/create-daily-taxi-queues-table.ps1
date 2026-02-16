# Create DailyTaxiQueues table
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

# Database connection
$connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres"

try {
    # Load Npgsql assembly
    Add-Type -Path "C:\Program Files\dotnet\sdk\9.0.310\refs\System.Runtime.dll"
    # Actually, let's use a simpler approach - use dotnet to run a small C# program

    Write-Host "Creating DailyTaxiQueues table..."
    Write-Host "SQL: $sql"
}
catch {
    Write-Host "Error: $($_.Exception.Message)"
}