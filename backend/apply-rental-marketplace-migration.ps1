# Apply Vehicle Rental Marketplace Migration
Write-Host "Applying Vehicle Rental Marketplace Migration..." -ForegroundColor Cyan

$connectionString = "Host=localhost;Database=MzansiFleet;Username=postgres;Password=Tenda@2024"
$migrationFile = ".\Migrations\20260117_AddVehicleRentalMarketplace.sql"

try {
    # Read the migration SQL
    $sql = Get-Content $migrationFile -Raw
    
    # Replace PRINT with PostgreSQL equivalent
    $sql = $sql -replace "PRINT '(.+?)';", "DO `$`$ BEGIN RAISE NOTICE '$1'; END `$`$;"
    
    # Execute using psql
    $sql | & 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -h localhost -U postgres -d MzansiFleet
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Migration applied successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Error applying migration: $_" -ForegroundColor Red
}
