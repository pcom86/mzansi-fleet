# Diagnose Trips and Tenant Relationship using API
$apiUrl = "http://localhost:5000/api"

Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "Trips & Tenant Relationship Diagnosis"  -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    # 1. Get all tenants
    Write-Host "1. Fetching Tenants..." -ForegroundColor Yellow
    $tenants = Invoke-RestMethod -Uri "$apiUrl/Tenants" -Method GET -ErrorAction Stop
    Write-Host "   Total Tenants: $($tenants.Count)" -ForegroundColor White
    Write-Host ""
    
    if ($tenants.Count -eq 0) {
        Write-Host "   No tenants found!" -ForegroundColor Red
        exit 1
    }
    
    # 2. For each tenant check vehicles and trips
    Write-Host "2. Tenant-wise Breakdown:" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($tenant in $tenants) {
        Write-Host "   Tenant: $($tenant.name)" -ForegroundColor Cyan
        Write-Host "   ID: $($tenant.id)" -ForegroundColor White
        
        # Get vehicles for this tenant
        try {
            $vehicles = Invoke-RestMethod -Uri "$apiUrl/Vehicles/tenant/$($tenant.id)" -Method GET -ErrorAction Stop
            Write-Host "   Vehicles: $($vehicles.Count)" -ForegroundColor White
            
            if ($vehicles.Count -gt 0) {
                # Get vehicle IDs
                $vehicleIds = $vehicles | ForEach-Object { $_.id }
                $vehicleIdsParam = $vehicleIds -join ','
                
                # Get trips for these vehicles
                try {
                    $trips = Invoke-RestMethod -Uri "$apiUrl/TripDetails?vehicleIds=$vehicleIdsParam" -Method GET -ErrorAction Stop
                    Write-Host "   Trips: $($trips.Count)" -ForegroundColor White
                    
                    if ($trips.Count -gt 0) {
                        Write-Host "   ✓ This tenant has vehicles AND trips" -ForegroundColor Green
                    } else {
                        Write-Host "   ✗ No trips found for this tenant vehicles" -ForegroundColor Red
                    }
                } catch {
                    Write-Host "   ✗ Error fetching trips" -ForegroundColor Red
                }
            } else {
                Write-Host "   Trips: 0" -ForegroundColor White
                Write-Host "   ✗ No vehicles assigned to this tenant" -ForegroundColor Red
            }
        } catch {
            Write-Host "   ✗ Error fetching vehicles" -ForegroundColor Red
        }
        
        Write-Host ""
    }
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Diagnosis Complete" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error occurred" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
}
