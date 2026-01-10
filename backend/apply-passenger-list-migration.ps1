# Apply Passenger List File Migration
$connectionString = "Host=localhost;Database=mzansi_fleet;Username=postgres;Password=postgres"

$sql = @"
ALTER TABLE "Trips" ADD COLUMN IF NOT EXISTS "PassengerListFileName" text NULL;
ALTER TABLE "Trips" ADD COLUMN IF NOT EXISTS "PassengerListFileData" text NULL;
"@

try {
    # Using psql command
    $env:PGPASSWORD = "postgres"
    $sql | psql -h localhost -U postgres -d mzansi_fleet
    
    Write-Host "Migration applied successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error applying migration: $_" -ForegroundColor Red
}
