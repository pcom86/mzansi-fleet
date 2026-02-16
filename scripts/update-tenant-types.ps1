param(
    [string]$TenantType = "Fleet Owner"
)

$connectionString = "Host=localhost;Port=5432;Database=MzansiFleetDb;Username=postgres;Password=postgres"

Write-Host "=== Update Tenant Types ===" -ForegroundColor Cyan
Write-Host "Setting all tenants (except edfed825-c3e2-4384-99fe-3cb3acfa51af) to: $TenantType" -ForegroundColor Yellow
Write-Host ""

try {
    # Load Npgsql
    Add-Type -Path "$PSScriptRoot\MzansiFleet.Repository\bin\Debug\net8.0\Npgsql.dll"
    
    $connection = New-Object Npgsql.NpgsqlConnection($connectionString)
    $connection.Open()
    
    Write-Host "Connected to database" -ForegroundColor Green
    
    # Update tenant types
    $updateSql = @"
UPDATE "Tenants"
SET "TenantType" = @TenantType
WHERE "Id" != 'edfed825-c3e2-4384-99fe-3cb3acfa51af'
  AND "TenantType" = 'Taxi Association';
"@
    
    $updateCmd = $connection.CreateCommand()
    $updateCmd.CommandText = $updateSql
    $updateCmd.Parameters.AddWithValue("@TenantType", $TenantType) | Out-Null
    
    $rowsAffected = $updateCmd.ExecuteNonQuery()
    Write-Host "Updated $rowsAffected tenant(s)" -ForegroundColor Green
    Write-Host ""
    
    # Display all tenants
    $selectSql = 'SELECT "Id", "Name", "TenantType", "Code" FROM "Tenants" ORDER BY "TenantType", "Name"'
    $selectCmd = $connection.CreateCommand()
    $selectCmd.CommandText = $selectSql
    
    $reader = $selectCmd.ExecuteReader()
    
    Write-Host "Current Tenants:" -ForegroundColor Cyan
    Write-Host ("{0,-40} {1,-30} {2,-20}" -f "ID", "Name", "Type") -ForegroundColor Yellow
    Write-Host ("-" * 90) -ForegroundColor Yellow
    
    while ($reader.Read()) {
        $id = $reader["Id"]
        $name = $reader["Name"]
        $type = $reader["TenantType"]
        
        $color = if ($type -eq "Taxi Association") { "Green" } else { "Gray" }
        Write-Host ("{0,-40} {1,-30} {2,-20}" -f $id, $name, $type) -ForegroundColor $color
    }
    
    $reader.Close()
    $connection.Close()
    
    Write-Host ""
    Write-Host "Update completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
