<#
.SYNOPSIS
    Diagnose trips and tenant relationship issues

.DESCRIPTION
    This script checks if vehicles have correct TenantId and if there are trips for those vehicles
#>

param(
    [string]$DatabaseName = "MzansiFleet",
    [string]$ServerHost = "localhost",
    [int]$Port = 5432,
    [string]$Username = "postgres",
    [Parameter(Mandatory=$false)]
    [string]$TenantId
)

$ErrorActionPreference = "Stop"
$password = $env:PGPASSWORD
if (-not $password) {
    $password = "postgres"
}

$connectionString = "Host=$ServerHost;Port=$Port;Database=$DatabaseName;Username=$Username;Password=$password"

# Find and load Npgsql assembly (using existing pattern from other scripts)
$npgsqlPath = Get-ChildItem -Path "$env:USERPROFILE\.nuget\packages\npgsql" -Filter "Npgsql.dll" -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.DirectoryName -like "*\lib\net8.0" -or $_.DirectoryName -like "*\lib\net6.0" } | 
    Select-Object -First 1

if (-not $npgsqlPath) {
    Write-Host "ERROR: Npgsql.dll not found." -ForegroundColor Red
    exit 1
}

try {
    Add-Type -Path $npgsqlPath.FullName -ErrorAction SilentlyContinue
} catch {
    # Ignore and continue
}

# Connect and query
$connection = $null
try {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Trips & Tenant Relationship Diagnosis" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $connection = [Npgsql.NpgsqlConnection]::new($connectionString)
    $connection.Open()
    
    # 1. Check Trips table structure
    Write-Host "1. Checking Trips table structure..." -ForegroundColor Yellow
    $command = $connection.CreateCommand()
    $command.CommandText = "SELECT column_name FROM information_schema.columns WHERE table_name = 'Trips' AND column_name = 'TenantId';"
    $hasTenantIdInTrips = $command.ExecuteScalar()
    
    if ($hasTenantIdInTrips) {
        Write-Host "   ✓ Trips table HAS TenantId column" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Trips table DOES NOT have TenantId column" -ForegroundColor Red
        Write-Host "   → Trips must be filtered through Vehicle relationship" -ForegroundColor Yellow
    }
    Write-Host ""
    
    # 2. Check overall statistics
    Write-Host "2. Database Statistics:" -ForegroundColor Yellow
    $command.CommandText = @"
SELECT 
    (SELECT COUNT(*) FROM "Trips") as total_trips,
    (SELECT COUNT(*) FROM "Vehicles") as total_vehicles,
    (SELECT COUNT(*) FROM "Vehicles" WHERE "TenantId" IS NOT NULL) as vehicles_with_tenant,
    (SELECT COUNT(DISTINCT "TenantId") FROM "Vehicles" WHERE "TenantId" IS NOT NULL) as tenants_with_vehicles,
    (SELECT COUNT(*) FROM "Tenants") as total_tenants;
"@
    $reader = $command.ExecuteReader()
    
    if ($reader.Read()) {
        Write-Host "   Total Trips: $($reader.GetInt64(0))" -ForegroundColor White
        Write-Host "   Total Vehicles: $($reader.GetInt64(1))" -ForegroundColor White
        Write-Host "   Vehicles with TenantId: $($reader.GetInt64(2))" -ForegroundColor White
        Write-Host "   Tenants with Vehicles: $($reader.GetInt64(3))" -ForegroundColor White
        Write-Host "   Total Tenants: $($reader.GetInt64(4))" -ForegroundColor White
    }
    $reader.Close()
    Write-Host ""
    
    # 3. Check trips to vehicles relationship
    Write-Host "3. Checking Trips-to-Vehicles Relationship:" -ForegroundColor Yellow
    $command.CommandText = @"
SELECT 
    COUNT(DISTINCT t."VehicleId") as vehicles_with_trips,
    COUNT(*) as total_trip_records
FROM "Trips" t
INNER JOIN "Vehicles" v ON t."VehicleId" = v."Id";
"@
    $reader = $command.ExecuteReader()
    
    if ($reader.Read()) {
        Write-Host "   Vehicles that have trips: $($reader.GetInt64(0))" -ForegroundColor White
        Write-Host "   Trip records with valid vehicles: $($reader.GetInt64(1))" -ForegroundColor White
    }
    $reader.Close()
    Write-Host ""
    
    # 4. Check if specific tenant provided
    if ($TenantId) {
        Write-Host "4. Checking Tenant: $TenantId" -ForegroundColor Yellow
        
        # Get tenant name
        $command.CommandText = "SELECT ""Name"" FROM ""Tenants"" WHERE ""Id"" = @tenantId;"
        $command.Parameters.Clear()
        $command.Parameters.AddWithValue("tenantId", [Guid]$TenantId) | Out-Null
        $tenantName = $command.ExecuteScalar()
        
        if ($tenantName) {
            Write-Host "   Tenant Name: $tenantName" -ForegroundColor Green
            
            # Get vehicles for this tenant
            $command.CommandText = "SELECT COUNT(*) FROM ""Vehicles"" WHERE ""TenantId"" = @tenantId;"
            $vehicleCount = $command.ExecuteScalar()
            Write-Host "   Vehicles for this tenant: $vehicleCount" -ForegroundColor White
            
            # Get trips for this tenant's vehicles
            $command.CommandText = @"
SELECT COUNT(*) 
FROM "Trips" t
INNER JOIN "Vehicles" v ON t."VehicleId" = v."Id"
WHERE v."TenantId" = @tenantId;
"@
            $tripCount = $command.ExecuteScalar()
            Write-Host "   Trips for this tenant's vehicles: $tripCount" -ForegroundColor White
            
            if ($vehicleCount -eq 0) {
                Write-Host ""
                Write-Host "   ⚠ ISSUE: This tenant has NO vehicles!" -ForegroundColor Red
                Write-Host "   → Assign vehicles to this tenant first" -ForegroundColor Yellow
            } elseif ($tripCount -eq 0) {
                Write-Host ""
                Write-Host "   ⚠ ISSUE: This tenant's vehicles have NO trips!" -ForegroundColor Red
                Write-Host "   → Create trips for this tenant's vehicles" -ForegroundColor Yellow
            } else {
                Write-Host ""
                Write-Host "   ✓ This tenant has vehicles AND trips!" -ForegroundColor Green
            }
        } else {
            Write-Host "   ✗ Tenant not found with ID: $TenantId" -ForegroundColor Red
        }
    } else {
        Write-Host "4. Tenant-wise Trip Breakdown:" -ForegroundColor Yellow
        $command.CommandText = @"
SELECT 
    t."Name" as tenant_name,
    t."Id" as tenant_id,
    COUNT(DISTINCT v."Id") as vehicle_count,
    COUNT(trip."Id") as trip_count
FROM "Tenants" t
LEFT JOIN "Vehicles" v ON v."TenantId" = t."Id"
LEFT JOIN "Trips" trip ON trip."VehicleId" = v."Id"
GROUP BY t."Id", t."Name"
ORDER BY trip_count DESC;
"@
        $reader = $command.ExecuteReader()
        
        $hasResults = $false
        while ($reader.Read()) {
            $hasResults = $true
            $tName = $reader.GetString(0)
            $tId = $reader.GetGuid(1)
            $vCount = $reader.GetInt64(2)
            $tCount = $reader.GetInt64(3)
            
            Write-Host "   $tName ($tId)" -ForegroundColor White
            Write-Host "     Vehicles: $vCount | Trips: $tCount" -ForegroundColor Cyan
        }
        
        if (-not $hasResults) {
            Write-Host "   No tenants found in database" -ForegroundColor Yellow
        }
        
        $reader.Close()
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Diagnosis Complete" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $connection.Close()
}
catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($connection -and $connection.State -eq "Open") {
        $connection.Close()
    }
    exit 1
}
