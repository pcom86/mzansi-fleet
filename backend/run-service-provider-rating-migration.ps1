# Script to add ServiceProviderRating column to MechanicalRequests and MaintenanceHistories tables

$connectionString = "Host=localhost;Database=mzansifleet;Username=postgres;Password=P@ssw0rd"

# Read the SQL file
$sqlScript = Get-Content -Path "c:\Users\pmaseko\mzansi fleet\backend\Migrations\20260109_AddServiceProviderRating.sql" -Raw

try {
    # Load Npgsql assembly (if not already loaded)
    Add-Type -Path "C:\Users\pmaseko\.nuget\packages\npgsql\10.0.0\lib\net10.0\Npgsql.dll" -ErrorAction SilentlyContinue
    
    Write-Host "Connecting to database..." -ForegroundColor Cyan
    $connection = New-Object Npgsql.NpgsqlConnection($connectionString)
    $connection.Open()
    
    Write-Host "Executing migration..." -ForegroundColor Cyan
    $command = $connection.CreateCommand()
    $command.CommandText = $sqlScript
    $result = $command.ExecuteNonQuery()
    
    Write-Host "Migration completed successfully!" -ForegroundColor Green
    Write-Host "Affected rows: $result" -ForegroundColor Green
    
    $connection.Close()
}
catch {
    Write-Host "Error executing migration: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($connection) {
        $connection.Close()
    }
    exit 1
}
