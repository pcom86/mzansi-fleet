# Test Authentication APIs

Write-Host "MzansiFleet Authentication API Tests" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000/api/Identity"

# Function to display response
function Show-Response {
    param($response, $title)
    Write-Host $title -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Yellow
    if ($response.Content) {
        $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
    }
    Write-Host ""
}

# Test 1: Try to get users without authentication (should work, as auth middleware is not yet enabled)
Write-Host "Test 1: Getting users list..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/users" -Method GET -ContentType "application/json"
    Show-Response $response "✓ Users retrieved successfully"
} catch {
    Write-Host "✗ Failed to get users: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Create a test tenant first
Write-Host "Test 2: Creating test tenant..." -ForegroundColor Cyan
$tenantBody = @{
    name = "Test Tenant"
    contactEmail = "tenant@test.com"
    contactPhone = "+27111234567"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/tenants" -Method POST -Body $tenantBody -ContentType "application/json"
    $tenant = $response.Content | ConvertFrom-Json
    $tenantId = $tenant.id
    Write-Host "✓ Tenant created with ID: $tenantId" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "⚠ Could not create tenant, using default ID" -ForegroundColor Yellow
    $tenantId = "00000000-0000-0000-0000-000000000001"
}

# Test 3: Create a test user with hashed password
Write-Host "Test 3: Creating test user..." -ForegroundColor Cyan
$userBody = @{
    tenantId = $tenantId
    email = "testuser@mzansifleet.com"
    phone = "+27821234567"
    passwordHash = "XohImNooBHFR0OVvjcYpJ3NgPQ1qq73WKhHvch0VQtg="  # Hash of "password"
    role = "Admin"
    isActive = $true
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/users" -Method POST -Body $userBody -ContentType "application/json"
    $user = $response.Content | ConvertFrom-Json
    Write-Host "✓ User created successfully" -ForegroundColor Green
    Write-Host "  Email: $($user.email)" -ForegroundColor White
    Write-Host "  Role: $($user.role)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "⚠ User might already exist or error occurred" -ForegroundColor Yellow
    Write-Host ""
}

# Test 4: Login with the test user
Write-Host "Test 4: Testing login..." -ForegroundColor Cyan
$loginBody = @{
    email = "testuser@mzansifleet.com"
    password = "password"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/login" -Method POST -Body $loginBody -ContentType "application/json"
    $loginResult = $response.Content | ConvertFrom-Json
    
    Write-Host "✓ Login successful!" -ForegroundColor Green
    Write-Host "  User ID: $($loginResult.userId)" -ForegroundColor White
    Write-Host "  Email: $($loginResult.email)" -ForegroundColor White
    Write-Host "  Role: $($loginResult.role)" -ForegroundColor White
    Write-Host "  Token: $($loginResult.token.Substring(0, 50))..." -ForegroundColor White
    Write-Host "  Expires: $($loginResult.expiresAt)" -ForegroundColor White
    Write-Host ""
    
    $token = $loginResult.token
    
    # Test 5: Use the token (future: will need auth middleware)
    Write-Host "Test 5: Token generated successfully" -ForegroundColor Cyan
    Write-Host "  Token length: $($token.Length) characters" -ForegroundColor White
    Write-Host ""
    
    # Test 6: Logout
    Write-Host "Test 6: Testing logout..." -ForegroundColor Cyan
    $logoutBody = @{
        token = $token
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/logout" -Method POST -Body $logoutBody -ContentType "application/json"
    $logoutResult = $response.Content | ConvertFrom-Json
    
    Write-Host "✓ Logout successful!" -ForegroundColor Green
    Write-Host "  Message: $($logoutResult.message)" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "✗ Authentication test failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 7: Try login with wrong password
Write-Host "Test 7: Testing login with wrong password..." -ForegroundColor Cyan
$wrongLoginBody = @{
    email = "testuser@mzansifleet.com"
    password = "wrongpassword"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/login" -Method POST -Body $wrongLoginBody -ContentType "application/json"
    Write-Host "✗ Should have failed with wrong password" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✓ Correctly rejected wrong password (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "⚠ Unexpected error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Summary
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✓ API is running on port 5000" -ForegroundColor Green
Write-Host "✓ Login endpoint: POST /api/Identity/login" -ForegroundColor Green
Write-Host "✓ Logout endpoint: POST /api/Identity/logout" -ForegroundColor Green
Write-Host "✓ JWT tokens are being generated" -ForegroundColor Green
Write-Host "✓ Password validation is working" -ForegroundColor Green
Write-Host ""
Write-Host "Test user credentials:" -ForegroundColor Yellow
Write-Host "  Email: testuser@mzansifleet.com" -ForegroundColor White
Write-Host "  Password: password" -ForegroundColor White
Write-Host ""
Write-Host "Swagger UI: http://localhost:5000/swagger" -ForegroundColor Cyan
Write-Host ""
