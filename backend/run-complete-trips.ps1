# PowerShell script to run the complete-all-trips.sql script
# Uses Npgsql library to connect directly to PostgreSQL

$connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres"
$sqlScriptPath = "complete-all-trips.sql"

# Parse connection string
$parts = $connectionString.Split(';')
$dbHost = ($parts | Where-Object { $_ -like 'Host=*' }) -replace 'Host=', ''
$database = ($parts | Where-Object { $_ -like 'Database=*' }) -replace 'Database=', ''
$username = ($parts | Where-Object { $_ -like 'Username=*' }) -replace 'Username=', ''
$password = ($parts | Where-Object { $_ -like 'Password=*' }) -replace 'Password=', ''

Write-Output "Running SQL script to complete all active trips..."
Write-Output "Database: $database"
Write-Output "Host: $dbHost"

try {
    # Load Npgsql assembly - try multiple paths
    $assemblyPaths = @(
        "$PSScriptRoot\MzansiFleet.Api\bin\Debug\net9.0\Npgsql.dll",
        "$PSScriptRoot\MzansiFleet.Api\bin\Release\net9.0\Npgsql.dll",
        "$PSScriptRoot\MzansiFleet.Api\publish\Npgsql.dll"
    )
    
    $assemblyPath = $null
    foreach ($path in $assemblyPaths) {
        if (Test-Path $path) {
            $assemblyPath = $path
            break
        }
    }
    
    if ($assemblyPath) {
        Add-Type -Path $assemblyPath
        Write-Output "Loaded Npgsql from: $assemblyPath"
    } else {
        throw "Npgsql assembly not found. Please ensure the backend is built."
    }

    # Read SQL script
    $sqlScript = Get-Content $sqlScriptPath -Raw

    # Create connection and execute
    $conn = New-Object Npgsql.NpgsqlConnection("Host=$dbHost;Database=$database;Username=$username;Password=$password")
    $conn.Open()
    
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $sqlScript
    $rowsAffected = $cmd.ExecuteNonQuery()
    
    $conn.Close()
    
    Write-Output "Script executed successfully."
    Write-Output "Rows affected: $rowsAffected"
    
    # Verify completed trips count
    $conn = New-Object Npgsql.NpgsqlConnection("Host=$dbHost;Database=$database;Username=$username;Password=$password")
    $conn.Open()
    
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = 'SELECT COUNT(*) FROM "TaxiRankTrips" WHERE "Status" = ' + "'Completed'"
    $completedCount = $cmd.ExecuteScalar()
    
    $conn.Close()
    
    Write-Output "Total completed trips: $completedCount"
}
catch {
    Write-Output "Error executing script: $($_.Exception.Message)"
    Write-Output "Stack trace: $($_.ScriptStackTrace)"
}
