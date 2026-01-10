# Test script for Service Provider Registration
# Run this after starting the backend API

$baseUrl = "http://localhost:5000/api"

Write-Host "===== Service Provider Registration Test =====" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get or create a tenant first
Write-Host "Step 1: Getting tenants..." -ForegroundColor Yellow
try {
    $tenants = Invoke-RestMethod -Uri "$baseUrl/Identity/tenants" -Method Get
    
    if ($tenants -and $tenants.Count -gt 0) {
        $tenantId = $tenants[0].id
        Write-Host "Using existing tenant: $tenantId" -ForegroundColor Green
    } else {
        Write-Host "No tenants found. Creating a test tenant..." -ForegroundColor Yellow
        
        $tenantData = @{
            name = "Test Fleet Company"
            contactEmail = "admin@testfleet.com"
            contactPhone = "+27 11 000 0000"
        } | ConvertTo-Json
        
        $newTenant = Invoke-RestMethod -Uri "$baseUrl/Identity/tenants" `
            -Method Post `
            -Body $tenantData `
            -ContentType "application/json"
        
        $tenantId = $newTenant.id
        Write-Host "Created new tenant: $tenantId" -ForegroundColor Green
    }
} catch {
    Write-Host "Error getting/creating tenant: $_" -ForegroundColor Red
    Write-Host "Make sure the API is running on $baseUrl" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Register a service provider
Write-Host "Step 2: Registering a new service provider..." -ForegroundColor Yellow

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$registrationData = @{
    tenantId = $tenantId
    email = "serviceprovider_$timestamp@example.com"
    password = "SecurePassword123!"
    phone = "+27 11 123 4567"
    businessName = "Test Auto Repairs - $timestamp"
    registrationNumber = "REG$timestamp"
    contactPerson = "John Smith"
    address = "123 Main Street, Johannesburg, 2001"
    serviceTypes = "Mechanical, Electrical, Routine Service"
    vehicleCategories = "Sedan, SUV, Van, Truck"
    operatingHours = "Mon-Fri: 8AM-5PM, Sat: 9AM-1PM"
    hourlyRate = 350.00
    callOutFee = 500.00
    serviceRadiusKm = 50.0
    bankAccount = "FNB: 62123456789"
    taxNumber = "TAX987654"
    certificationsLicenses = "ASE Master Technician, ISO 9001"
    notes = "Test service provider created via script"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "$baseUrl/Identity/register-service-provider" `
        -Method Post `
        -Body $registrationData `
        -ContentType "application/json"
    
    Write-Host "✓ Service provider registered successfully!" -ForegroundColor Green
    Write-Host "  Profile ID: $($result.profileId)" -ForegroundColor Gray
    Write-Host "  User ID: $($result.userId)" -ForegroundColor Gray
    Write-Host "  Business Name: $($result.businessName)" -ForegroundColor Gray
    Write-Host "  Email: $($result.email)" -ForegroundColor Gray
    
    $registeredEmail = $result.email
    $registeredUserId = $result.userId
    
    Write-Host ""
    
    # Step 3: Test login with the newly registered service provider
    Write-Host "Step 3: Testing login with registered credentials..." -ForegroundColor Yellow
    
    $loginData = @{
        email = $registeredEmail
        password = "SecurePassword123!"
    } | ConvertTo-Json
    
    try {
        $loginResult = Invoke-RestMethod -Uri "$baseUrl/Identity/login" `
            -Method Post `
            -Body $loginData `
            -ContentType "application/json"
        
        Write-Host "✓ Login successful!" -ForegroundColor Green
        Write-Host "  Token: $($loginResult.token.Substring(0, 50))..." -ForegroundColor Gray
        Write-Host "  Role: $($loginResult.role)" -ForegroundColor Gray
        Write-Host "  Expires: $($loginResult.expiresAt)" -ForegroundColor Gray
    } catch {
        Write-Host "✗ Login failed: $_" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "===== Test Summary =====" -ForegroundColor Cyan
    Write-Host "✓ Tenant obtained/created" -ForegroundColor Green
    Write-Host "✓ Service provider registered" -ForegroundColor Green
    Write-Host "✓ Login tested" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "✗ Registration failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  1. Make sure the API is running (dotnet run in backend/MzansiFleet.Api)" -ForegroundColor Gray
    Write-Host "  2. Check if the database connection is working" -ForegroundColor Gray
    Write-Host "  3. Verify the API URL is correct: $baseUrl" -ForegroundColor Gray
}

Write-Host ""
Write-Host "===== Additional Test Cases =====" -ForegroundColor Cyan
Write-Host ""

# Test case: Try to register with duplicate email
Write-Host "Test Case 1: Attempting duplicate email registration..." -ForegroundColor Yellow
$duplicateData = $registrationData | ConvertFrom-Json
$duplicateData.businessName = "Another Business"
$duplicateDataJson = $duplicateData | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$baseUrl/Identity/register-service-provider" `
        -Method Post `
        -Body $duplicateDataJson `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "✗ Should have failed with duplicate email!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "✓ Correctly rejected duplicate email (409 Conflict)" -ForegroundColor Green
    } else {
        Write-Host "? Got error but not 409: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

Write-Host ""

# Test case: Try to register with missing required fields
Write-Host "Test Case 2: Attempting registration with missing required fields..." -ForegroundColor Yellow
$invalidData = @{
    tenantId = $tenantId
    email = ""
    password = ""
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$baseUrl/Identity/register-service-provider" `
        -Method Post `
        -Body $invalidData `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "✗ Should have failed with missing fields!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✓ Correctly rejected missing fields (400 Bad Request)" -ForegroundColor Green
    } else {
        Write-Host "? Got error but not 400: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "All tests completed!" -ForegroundColor Cyan
