# Simple migration using dotnet script
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Tracking Device Tables Migration" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = $PSScriptRoot
$csharpFile = Join-Path $scriptPath "ApplyTrackingMigration.cs"
$sqlFile = Join-Path $scriptPath "add-tracking-device-tables.sql"

# Copy SQL file to output location for the script
Copy-Item $sqlFile -Destination $sqlFile -Force

Write-Host "Compiling and running migration..." -ForegroundColor Yellow
Write-Host ""

# Run using dotnet script
dotnet script $csharpFile

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Success!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    exit 1
}
