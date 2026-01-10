# Run SQL migration script
$sqlFile = "c:\Users\pmaseko\mzansi fleet\backend\Migrations\20260109_AddTaxiRankEntity.sql"
$sqlContent = Get-Content $sqlFile -Raw

# Database connection details
$server = "localhost"
$database = "mzansi_fleet"
$username = "postgres"
$password = "123"

# Load Npgsql
Add-Type -Path "C:\Users\pmaseko\.nuget\packages\npgsql\8.0.1\lib\net8.0\Npgsql.dll"

# Connection string
$connectionString = "Host=$server;Database=$database;Username=$username;Password=$password"

try {
    $connection = New-Object Npgsql.NpgsqlConnection($connectionString)
    $connection.Open()
    
    $command = $connection.CreateCommand()
    $command.CommandText = $sqlContent
    $command.ExecuteNonQuery() | Out-Null
    
    Write-Host "Migration executed successfully!" -ForegroundColor Green
    
    $connection.Close()
}
catch {
    Write-Host "Error executing migration: $_" -ForegroundColor Red
    exit 1
}
