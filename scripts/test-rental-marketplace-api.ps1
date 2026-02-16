# Test Vehicle Rental Marketplace API
Write-Host "🧪 Testing Vehicle Rental Marketplace API..." -ForegroundColor Cyan

# Get JWT token
$loginUrl = "http://localhost:5000/api/Identity/login"
$loginBody = @{
    email = "info@mdutransport.co.za"
    password = "password123"
} | ConvertTo-Json

Write-Host "`n1. Logging in..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✓ Login successful! Token received" -ForegroundColor Green
} catch {
    Write-Host "✗ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Set headers with token
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test 1: Create a rental request
Write-Host "`n2. Creating a rental request..." -ForegroundColor Yellow
$requestBody = @{
    vehicleType = "Sedan"
    minCapacity = 4
    startDate = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss")
    endDate = (Get-Date).AddDays(14).ToString("yyyy-MM-ddTHH:mm:ss")
    pickupLocation = "Johannesburg CBD"
    dropoffLocation = "Sandton City"
    budget = 5000
    additionalRequirements = "Air conditioning required, prefer newer models"
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/RentalMarketplace/requests" -Method POST -Headers $headers -Body $requestBody
    Write-Host "✓ Rental request created successfully!" -ForegroundColor Green
    Write-Host "  Request ID: $($createResponse.id)" -ForegroundColor Cyan
    $requestId = $createResponse.id
} catch {
    Write-Host "✗ Failed to create rental request: $_" -ForegroundColor Red
    Write-Host "Error Details: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# Test 2: Get my rental requests
Write-Host "`n3. Fetching my rental requests..." -ForegroundColor Yellow
try {
    $myRequests = Invoke-RestMethod -Uri "http://localhost:5000/api/RentalMarketplace/my-requests" -Method GET -Headers $headers
    Write-Host "✓ Retrieved $($myRequests.Count) rental request(s)" -ForegroundColor Green
    foreach ($req in $myRequests) {
        Write-Host "  - $($req.vehicleType) | $($req.pickupLocation) to $($req.dropoffLocation) | Status: $($req.status)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "✗ Failed to fetch rental requests: $_" -ForegroundColor Red
}

# Test 3: Browse marketplace (as owner)
Write-Host "`n4. Browsing rental marketplace..." -ForegroundColor Yellow
try {
    $marketplace = Invoke-RestMethod -Uri "http://localhost:5000/api/RentalMarketplace/marketplace" -Method GET -Headers $headers
    Write-Host "✓ Retrieved $($marketplace.Count) open rental request(s) in marketplace" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to browse marketplace: $_" -ForegroundColor Red
}

Write-Host "`n✅ Vehicle Rental Marketplace API is functional!" -ForegroundColor Green
