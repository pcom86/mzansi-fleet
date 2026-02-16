# Add UserId column to TripPassengers table
$sqlFile = "c:\Users\pmaseko\mzansi fleet\scripts\add-userid-to-trippassengers.sql"
$sqlContent = Get-Content $sqlFile -Raw

# Database connection details
$server = "localhost"
$database = "MzansiFleetDb"
$username = "postgres"
$password = "postgres"

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

    Write-Host "UserId column migration executed successfully!" -ForegroundColor Green

    $connection.Close()
}
catch {
    Write-Host "Error executing migration: $_" -ForegroundColor Red
    exit 1
}