# Apply Tender Tables Migration
# This script creates the Tenders and TenderApplications tables

$connectionString = "Host=localhost;Database=MzansiFleet Database;Username=postgres;Password=passy123"

# Read the SQL migration file
$sqlScript = Get-Content -Path ".\Migrations\20260115_AddTenderTables.sql" -Raw

# Execute the migration using Npgsql
try {
    # Find Npgsql DLL
    $npgsqlPath = (Get-ChildItem -Path "$env:USERPROFILE\.nuget\packages\npgsql" -Recurse -Filter "Npgsql.dll" | Where-Object { $_.FullName -like "*net8.0*" } | Select-Object -First 1).FullName
    
    Add-Type -Path $npgsqlPath
    
    $connection = New-Object Npgsql.NpgsqlConnection($connectionString)
    $connection.Open()
    
    $command = $connection.CreateCommand()
    $command.CommandText = $sqlScript
    $result = $command.ExecuteNonQuery()
    
    Write-Host "Tender tables migration applied successfully!" -ForegroundColor Green
    Write-Host "Rows affected: $result" -ForegroundColor Cyan
    
    $connection.Close()
}
catch {
    Write-Host "Error applying migration:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host $_.Exception.StackTrace -ForegroundColor DarkGray
    exit 1
}
