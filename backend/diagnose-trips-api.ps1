# Diagnose Trips and Tenant Relationship using API
$apiUrl = "http://localhost:5000/api"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Trips & Tenant Relationship Diagnosis" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    # 1. Get all tenants
    Write-Host "1. Fetching Tenants..." -ForegroundColor Yellow
    $tenants = Invoke-RestMethod -Uri "$apiUrl/Tenants" -Method GET -ErrorAction Stop
    Write-Host "   Total Tenants: $($tenants.Count)" -ForegroundColor White
    Write-Host ""
    
    if ($tenants.Count -eq 0) {
        Write-Host "   ✗ No tenants found!" -ForegroundColor Red
        exit 1
    }
    
    # 2. For each tenant, check vehicles and trips
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
                        $tripDates = $trips | ForEach-Object { $_.tripDate }
                        $minDate = ($tripDates | Measure-Object -Minimum).Minimum
                        $maxDate = ($tripDates | Measure-Object -Maximum).Maximum
                        Write-Host "   Trip Date Range: $minDate to $maxDate" -ForegroundColor Green
                        Write-Host "   ✓ This tenant has vehicles AND trips" -ForegroundColor Green
                    } else {
                        Write-Host "   ✗ No trips found for this tenant's vehicles" -ForegroundColor Red
                    }
                } catch {
                    Write-Host "   ✗ Error fetching trips: $($_.Exception.Message)" -ForegroundColor Red
                }
            } else {
                Write-Host "   Trips: 0" -ForegroundColor White
                Write-Host "   ✗ No vehicles assigned to this tenant" -ForegroundColor Red
            }
        } catch {
            Write-Host "   ✗ Error fetching vehicles: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        Write-Host ""
    }
    
    # 3. Get overall trip statistics
    Write-Host "3. Checking Overall Trip Data..." -ForegroundColor Yellow
    try {
        $allTrips = Invoke-RestMethod -Uri "$apiUrl/TripDetails" -Method GET -ErrorAction Stop
        Write-Host "   Total Trips in Database: $($allTrips.Count)" -ForegroundColor White
        
        if ($allTrips.Count -gt 0) {
            $tripDates = $allTrips | ForEach-Object { [DateTime]$_.tripDate }
            $minDate = ($tripDates | Measure-Object -Minimum).Minimum
            $maxDate = ($tripDates | Measure-Object -Maximum).Maximum
            Write-Host "   Earliest Trip: $($minDate.ToString('yyyy-MM-dd'))" -ForegroundColor White
            Write-Host "   Latest Trip: $($maxDate.ToString('yyyy-MM-dd'))" -ForegroundColor White
        } else {
            Write-Host "   ✗ No trips found in database!" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ✗ Error fetching all trips: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Diagnosis Complete" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Yellow
    Write-Host "- Trips table does NOT have direct TenantId column" -ForegroundColor White
    Write-Host "- Trips are filtered through Vehicle → TenantId relationship" -ForegroundColor White
    Write-Host "- If you see 'No Data Available', check:" -ForegroundColor White
    Write-Host "  1. Are vehicles assigned to the correct tenant?" -ForegroundColor Cyan
    Write-Host "  2. Do those vehicles have trips recorded?" -ForegroundColor Cyan
    Write-Host "  3. Are you filtering with the correct date range?" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure the backend API is running at ${apiUrl}" -ForegroundColor Yellow
}
