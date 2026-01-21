# Apply tracking device migration using Entity Framework Core

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Tracking Device Tables Migration (EF Core)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = $PSScriptRoot
$sqlFile = Join-Path $scriptPath "add-tracking-device-tables.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "Error: Migration file not found at $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "Reading SQL file..." -ForegroundColor Yellow
$sqlContent = Get-Content $sqlFile -Raw

Write-Host "Executing migration using dotnet ef..." -ForegroundColor Yellow
Write-Host ""

try {
    # Navigate to the API project
    Push-Location (Join-Path $scriptPath "MzansiFleet.Api")
    
    # Execute the SQL using dotnet ef dbcontext scaffold or custom command
    # Alternative: Use dotnet script
    $csharpScript = @"
using System;
using Microsoft.EntityFrameworkCore;
using Npgsql;

var connectionString = "Host=localhost;Port=5432;Database=mzansi_fleet_db;Username=postgres;Password=postgres";
using var connection = new NpgsqlConnection(connectionString);
connection.Open();

var sql = @"$($sqlContent -replace '"', '""')";

using var command = new NpgsqlCommand(sql, connection);
command.ExecuteNonQuery();

Console.WriteLine("Migration completed successfully!");
"@

    # Save the script
    $tempScript = Join-Path $scriptPath "temp-migration.csx"
    $csharpScript | Out-File -FilePath $tempScript -Encoding UTF8
    
    Write-Host "Executing SQL commands..." -ForegroundColor Yellow
    dotnet script $tempScript
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Created tables:" -ForegroundColor Cyan
        Write-Host "  - TrackingDeviceRequests" -ForegroundColor White
        Write-Host "  - TrackingDeviceOffers" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "Migration failed!" -ForegroundColor Red
        exit 1
    }
    
    # Clean up
    if (Test-Path $tempScript) {
        Remove-Item $tempScript
    }
    
} catch {
    Write-Host ""
    Write-Host "Error executing migration!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Migration process completed!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
