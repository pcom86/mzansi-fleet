# Test script to verify tender applications endpoint
# This tests the fixed GetTenderApplications endpoint

Write-Host "Testing Tender Applications Endpoint..." -ForegroundColor Cyan
Write-Host ""

# You'll need to replace these values with actual data from your database
$tenderPublisherToken = "YOUR_PUBLISHER_AUTH_TOKEN_HERE"
$tenderId = "YOUR_TENDER_ID_HERE"

# Test endpoint
$apiUrl = "http://localhost:5000/api/Tender/$tenderId/applications"

Write-Host "Testing: GET $apiUrl" -ForegroundColor Yellow
Write-Host ""

try {
    $headers = @{
        "Authorization" = "Bearer $tenderPublisherToken"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri $apiUrl -Method Get -Headers $headers
    
    Write-Host "✅ Success! Retrieved applications:" -ForegroundColor Green
    Write-Host "Total Applications: $($response.Length)" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($app in $response) {
        Write-Host "Application ID: $($app.Id)" -ForegroundColor White
        Write-Host "  Applicant: $($app.FleetSummary.CompanyName)" -ForegroundColor White
        Write-Host "  Contact: $($app.FleetSummary.ContactName) - $($app.FleetSummary.ContactPhone)" -ForegroundColor White
        Write-Host "  Fleet Size: $($app.FleetSummary.TotalVehicles) vehicles ($($app.FleetSummary.ActiveVehicles) active)" -ForegroundColor White
        Write-Host "  Status: $($app.Status)" -ForegroundColor White
        
        if ($app.FleetSummary.Vehicles -and $app.FleetSummary.Vehicles.Count -gt 0) {
            Write-Host "  ✅ Vehicle data loaded correctly!" -ForegroundColor Green
            Write-Host "  Sample vehicles:" -ForegroundColor Gray
            foreach ($vehicle in $app.FleetSummary.Vehicles | Select-Object -First 3) {
                Write-Host "    - $($vehicle.RegistrationNumber): $($vehicle.Make) $($vehicle.Model) ($($vehicle.VehicleType))" -ForegroundColor Gray
            }
        } else {
            Write-Host "  ⚠️ No vehicles found - check owner profile and vehicle data" -ForegroundColor Yellow
        }
        Write-Host ""
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "  1. Backend not running on port 5000" -ForegroundColor Yellow
    Write-Host "  2. Invalid auth token" -ForegroundColor Yellow
    Write-Host "  3. Tender ID doesn't exist" -ForegroundColor Yellow
    Write-Host "  4. User is not the tender publisher" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "To use this script:" -ForegroundColor Cyan
Write-Host "  1. Get a valid auth token by logging in as a tender publisher" -ForegroundColor Gray
Write-Host "  2. Find a tender ID that has applications" -ForegroundColor Gray
Write-Host "  3. Update the variables at the top of this script" -ForegroundColor Gray
Write-Host "  4. Run: .\test-tender-applications.ps1" -ForegroundColor Gray
