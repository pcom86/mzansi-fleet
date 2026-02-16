# Quick Create Owner Profile Script
# Creates a test owner profile with pre-defined values

Write-Host "MzansiFleet - Quick Create Test Owner Profile" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000/api/Identity"

# Pre-defined test data
$companyName = "ABC Transport Ltd"
$contactName = "John Doe"
$contactEmail = "john@abctransport.com"
$contactPhone = "+27111234567"
$address = "123 Main Street, Johannesburg, 2000"
$userEmail = "owner@abctransport.com"
$userPhone = "+27821234567"
$password = "Password123"

# SHA256 hash function
function Get-PasswordHash {
    param([string]$password)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($password)
    $hash = $sha256.ComputeHash($bytes)
    return [Convert]::ToBase64String($hash)
}

Write-Host "Creating owner profile with test data..." -ForegroundColor Yellow
Write-Host "  Company: $companyName" -ForegroundColor White
Write-Host "  Email: $userEmail" -ForegroundColor White
Write-Host "  Password: $password" -ForegroundColor White
Write-Host ""

# Step 1: Create Tenant
Write-Host "1. Creating tenant..." -ForegroundColor Yellow
$tenantBody = @{
    name = $companyName
    contactEmail = $contactEmail
    contactPhone = $contactPhone
} | ConvertTo-Json

try {
    $tenant = Invoke-RestMethod -Uri "$baseUrl/tenants" -Method POST -Body $tenantBody -ContentType "application/json"
    Write-Host "   ✓ Tenant created: $($tenant.id)" -ForegroundColor Green
    $tenantId = $tenant.id
} catch {
    Write-Host "   ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Create User
Write-Host "2. Creating user..." -ForegroundColor Yellow
$passwordHash = Get-PasswordHash -password $password

$userBody = @{
    tenantId = $tenantId
    email = $userEmail
    phone = $userPhone
    passwordHash = $passwordHash
    role = "Owner"
    isActive = $true
} | ConvertTo-Json

try {
    $user = Invoke-RestMethod -Uri "$baseUrl/users" -Method POST -Body $userBody -ContentType "application/json"
    Write-Host "   ✓ User created: $($user.id)" -ForegroundColor Green
    $userId = $user.id
} catch {
    Write-Host "   ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Create Owner Profile
Write-Host "3. Creating owner profile..." -ForegroundColor Yellow
$ownerProfileBody = @{
    userId = $userId
    companyName = $companyName
    contactName = $contactName
    contactEmail = $contactEmail
    contactPhone = $contactPhone
    address = $address
} | ConvertTo-Json

try {
    $ownerProfile = Invoke-RestMethod -Uri "$baseUrl/ownerprofiles" -Method POST -Body $ownerProfileBody -ContentType "application/json"
    Write-Host "   ✓ Owner profile created: $($ownerProfile.id)" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Test Login
Write-Host "4. Testing login..." -ForegroundColor Yellow
$loginBody = @{
    email = $userEmail
    password = $password
} | ConvertTo-Json

try {
    $loginResult = Invoke-RestMethod -Uri "$baseUrl/login" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Host "   ✓ Login successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Login Response:" -ForegroundColor Cyan
    Write-Host "  Token: $($loginResult.token.Substring(0, 50))..." -ForegroundColor White
    Write-Host "  User ID: $($loginResult.userId)" -ForegroundColor White
    Write-Host "  Email: $($loginResult.email)" -ForegroundColor White
    Write-Host "  Role: $($loginResult.role)" -ForegroundColor White
    Write-Host "  Tenant ID: $($loginResult.tenantId)" -ForegroundColor White
    Write-Host "  Expires: $($loginResult.expiresAt)" -ForegroundColor White
} catch {
    Write-Host "   ⚠ Login test failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Owner Profile Created!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor Yellow
Write-Host "  Email:    $userEmail" -ForegroundColor White
Write-Host "  Password: $password" -ForegroundColor White
Write-Host ""
Write-Host "IDs:" -ForegroundColor Yellow
Write-Host "  Tenant ID:        $tenantId" -ForegroundColor White
Write-Host "  User ID:          $userId" -ForegroundColor White
Write-Host "  Owner Profile ID: $($ownerProfile.id)" -ForegroundColor White
Write-Host ""
Write-Host "API Endpoints:" -ForegroundColor Yellow
Write-Host "  Login:   POST $baseUrl/login" -ForegroundColor White
Write-Host "  Profile: GET $baseUrl/ownerprofiles/$($ownerProfile.id)" -ForegroundColor White
Write-Host "  Swagger: http://localhost:5000/swagger" -ForegroundColor White
Write-Host ""
