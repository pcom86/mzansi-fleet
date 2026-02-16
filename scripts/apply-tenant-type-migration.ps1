Write-Host "Running AddTenantType migration..." -ForegroundColor Cyan

Set-Location "AddTenantType"

# Build and run the migration
dotnet run

if ($LASTEXITCODE -eq 0) {
    Write-Host "Migration completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Migration failed!" -ForegroundColor Red
}

Set-Location ..
