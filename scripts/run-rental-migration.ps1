#!/usr/bin/env pwsh
# Apply Rental Marketplace Migration using Npgsql

$connectionString = "Host=localhost;Database=MzansiFleet;Username=postgres;Password=Tenda@2024"

Write-Host "Applying Vehicle Rental Marketplace Migration..." -ForegroundColor Cyan

# Read SQL file
$sql = Get-Content "create-rental-tables.sql" -Raw

# Use .NET Npgsql
Add-Type -Path "C:\Users\$env:USERNAME\.nuget\packages\npgsql\8.0.1\lib\net8.0\Npgsql.dll" -ErrorAction SilentlyContinue

try {
    $connection = New-Object Npgsql.NpgsqlConnection($connectionString)
    $connection.Open()
    Write-Host "Connected to database" -ForegroundColor Green
    
    $command = $connection.CreateCommand()
    $command.CommandText = $sql
    $command.ExecuteNonQuery() | Out-Null
    
    Write-Host "Migration applied successfully!" -ForegroundColor Green
    $connection.Close()
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
