# Script to create VehicleEarningRecords table
Add-Type -Path "C:\Users\pmaseko\.nuget\packages\npgsql\10.0.0\lib\net8.0\Npgsql.dll"

$connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=Tenda@2024"

Write-Host "Creating VehicleEarningRecords table..." -ForegroundColor Cyan

try {
    $conn = [Npgsql.NpgsqlConnection]::new($connectionString)
    $conn.Open()
    
    $sql = Get-Content "create-vehicle-earnings-table.sql" -Raw
    
    $cmd = [Npgsql.NpgsqlCommand]::new($sql, $conn)
    $result = $cmd.ExecuteNonQuery()
    
    Write-Host "Table created successfully!" -ForegroundColor Green
    
    $conn.Close()
} catch {
    $errorMsg = $_.Exception.Message
    Write-Host "Error: $errorMsg" -ForegroundColor Red
}
