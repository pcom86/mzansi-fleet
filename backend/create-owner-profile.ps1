# Create Owner Profile Script
Write-Host "MzansiFleet - Create Owner Profile" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000/api/Identity"

# SHA256 hash function
function Get-PasswordHash {
    param([string]$password)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($password)
    $hash = $sha256.ComputeHash($bytes)
    return [Convert]::ToBase64String($hash)
}

# Get input from user
Write-Host "Enter Owner Profile Information:" -ForegroundColor Yellow
Write-Host ""

$companyName = Read-Host "Company Name (e.g., ABC Transport Ltd)"
$contactName = Read-Host "Contact Name (e.g., John Doe)"
$contactEmail = Read-Host "Contact Email (e.g., john@abctransport.com)"
$contactPhone = Read-Host "Contact Phone (e.g., +27111234567)"
$address = Read-Host "Company Address (e.g., 123 Main St, Johannesburg)"
Write-Host ""

$userEmail = Read-Host "User Email for login (e.g., owner@abctransport.com)"
$userPhone = Read-Host "User Phone (e.g., +27821234567)"
$passwordSecure = Read-Host "Password" -AsSecureString
$password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure))

Write-Host ""
Write-Host "Creating owner profile..." -ForegroundColor Cyan
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
Write-Host "  Password: [The password you entered]" -ForegroundColor White
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
