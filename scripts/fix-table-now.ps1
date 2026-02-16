$connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres"

Write-Host "Fixing VehicleRentalRequests table..." -ForegroundColor Cyan

$sql = @"
-- Add missing columns
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "BudgetMin" numeric(18,2);
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "BudgetMax" numeric(18,2);
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "SeatingCapacity" integer;
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "DurationDays" integer;
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "TripPurpose" text;
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "SpecialRequirements" text;
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "ClosedAt" timestamp without time zone;

-- Remove old columns
ALTER TABLE "VehicleRentalRequests" DROP COLUMN IF EXISTS "MinCapacity";
ALTER TABLE "VehicleRentalRequests" DROP COLUMN IF EXISTS "Budget";
ALTER TABLE "VehicleRentalRequests" DROP COLUMN IF EXISTS "AdditionalRequirements";
ALTER TABLE "VehicleRentalRequests" DROP COLUMN IF EXISTS "UpdatedAt";
"@

try {
    # Use Npgsql
    Add-Type -AssemblyName "System.Data"
    $connection = New-Object Npgsql.NpgsqlConnection($connectionString)
    $connection.Open()
    
    $command = $connection.CreateCommand()
    $command.CommandText = $sql
    $command.ExecuteNonQuery() | Out-Null
    
    Write-Host "✓ Table fixed successfully!" -ForegroundColor Green
    $connection.Close()
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try loading Npgsql if not available
    Write-Host "Trying to load Npgsql..." -ForegroundColor Yellow
    $npgsqlDll = Get-ChildItem -Path "$env:USERPROFILE\.nuget\packages\npgsql" -Filter "Npgsql.dll" -Recurse | Select-Object -First 1
    if ($npgsqlDll) {
        Add-Type -Path $npgsqlDll.FullName
        
        $connection = New-Object Npgsql.NpgsqlConnection($connectionString)
        $connection.Open()
        
        $command = $connection.CreateCommand()
        $command.CommandText = $sql
        $command.ExecuteNonQuery() | Out-Null
        
        Write-Host "✓ Table fixed successfully!" -ForegroundColor Green
        $connection.Close()
    } else {
        Write-Host "Could not find Npgsql.dll" -ForegroundColor Red
        exit 1
    }
}
