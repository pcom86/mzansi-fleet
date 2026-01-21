# Script to create test users via API
$baseUrl = "http://localhost:5000/api/Identity"

Write-Host "Creating test users for Mzansi Fleet..." -ForegroundColor Cyan
Write-Host ""

# First, create/verify the default tenant exists
$tenantBody = @{
    name = "Default Tenant"
    contactEmail = "admin@mzansifleet.com"
    contactPhone = "+27110000000"
} | ConvertTo-Json

Write-Host "Step 1: Creating default tenant..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/tenants" -Method POST -Body $tenantBody -ContentType "application/json"
    $tenant = $response.Content | ConvertFrom-Json
    $tenantId = $tenant.id
    Write-Host "✓ Tenant created: $($tenant.name) ($tenantId)" -ForegroundColor Green
} catch {
    Write-Host "⚠ Tenant might already exist" -ForegroundColor Yellow
    # Try to get existing tenant - for now, use a default ID
    $tenantId = "f98ab892-d9d1-432f-8fca-9ef9c00efad7"
    Write-Host "  Using tenant ID: $tenantId" -ForegroundColor White
}
Write-Host ""

# Create Owner user
Write-Host "Step 2: Creating Owner user..." -ForegroundColor Yellow
$ownerBody = @{
    email = "owner@mzansifleet.com"
    password = "password123"
    phone = "+27821234567"
    role = "Owner"
    tenantId = $tenantId
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/users" -Method POST -Body $ownerBody -ContentType "application/json"
    $owner = $response.Content | ConvertFrom-Json
    Write-Host "✓ Owner user created" -ForegroundColor Green
    Write-Host "  Email: $($owner.email)" -ForegroundColor White
    Write-Host "  Role: $($owner.role)" -ForegroundColor White
    Write-Host "  ID: $($owner.id)" -ForegroundColor White
} catch {
    Write-Host "⚠ Owner user might already exist or error occurred" -ForegroundColor Yellow
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Red
    }
}
Write-Host ""

# Create Renter user
Write-Host "Step 3: Creating Renter user..." -ForegroundColor Yellow
$renterBody = @{
    email = "renter@mzansifleet.com"
    password = "password123"
    phone = "+27829876543"
    role = "User"
    tenantId = $tenantId
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/users" -Method POST -Body $renterBody -ContentType "application/json"
    $renter = $response.Content | ConvertFrom-Json
    Write-Host "✓ Renter user created" -ForegroundColor Green
    Write-Host "  Email: $($renter.email)" -ForegroundColor White
    Write-Host "  Role: $($renter.role)" -ForegroundColor White
    Write-Host "  ID: $($renter.id)" -ForegroundColor White
} catch {
    Write-Host "⚠ Renter user might already exist or error occurred" -ForegroundColor Yellow
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Red
    }
}
Write-Host ""

# Test login with Owner
Write-Host "Step 4: Testing Owner login..." -ForegroundColor Yellow
$loginBody = @{
    email = "owner@mzansifleet.com"
    password = "password123"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/login" -Method POST -Body $loginBody -ContentType "application/json"
    $loginResult = $response.Content | ConvertFrom-Json
    Write-Host "✓ Owner login successful!" -ForegroundColor Green
    Write-Host "  Token: $($loginResult.token.Substring(0, 50))..." -ForegroundColor White
} catch {
    Write-Host "✗ Owner login failed" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Red
    }
}
Write-Host ""

# Test login with Renter
Write-Host "Step 5: Testing Renter login..." -ForegroundColor Yellow
$loginBody = @{
    email = "renter@mzansifleet.com"
    password = "password123"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/login" -Method POST -Body $loginBody -ContentType "application/json"
    $loginResult = $response.Content | ConvertFrom-Json
    Write-Host "✓ Renter login successful!" -ForegroundColor Green
    Write-Host "  Token: $($loginResult.token.Substring(0, 50))..." -ForegroundColor White
} catch {
    Write-Host "✗ Renter login failed" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Test Users Created" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Owner Account:" -ForegroundColor Yellow
Write-Host "  Email: owner@mzansifleet.com" -ForegroundColor White
Write-Host "  Password: password123" -ForegroundColor White
Write-Host "  Role: Owner (can offer vehicles for rent)" -ForegroundColor White
Write-Host ""
Write-Host "Renter Account:" -ForegroundColor Yellow
Write-Host "  Email: renter@mzansifleet.com" -ForegroundColor White
Write-Host "  Password: password123" -ForegroundColor White
Write-Host "  Role: User (can request rentals)" -ForegroundColor White
Write-Host ""
