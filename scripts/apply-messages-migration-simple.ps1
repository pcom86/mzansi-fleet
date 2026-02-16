# Simple PowerShell script to apply Messages table migration using Npgsql
# Usage: .\apply-messages-migration-simple.ps1

$sqlScript = Get-Content ".\add-messages-table.sql" -Raw

$connectionString = "Host=localhost;Port=5432;Database=mzansi_fleet;Username=postgres;Password=Maseko@1988"

Write-Host "Applying Messages table migration..." -ForegroundColor Cyan

try {
    Add-Type -Path "C:\Users\pmaseko\mzansi fleet\backend\MzansiFleet.API\bin\Debug\net8.0\Npgsql.dll"
    
    $connection = New-Object Npgsql.NpgsqlConnection($connectionString)
    $connection.Open()
    
    $command = $connection.CreateCommand()
    $command.CommandText = $sqlScript
    $command.ExecuteNonQuery() | Out-Null
    
    $connection.Close()
    
    Write-Host "`nMigration completed successfully!" -ForegroundColor Green
    Write-Host "Messages table created with indexes and constraints." -ForegroundColor Green
}
catch {
    Write-Host "`nMigration failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
}
