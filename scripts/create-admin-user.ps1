# Create Admin User - Phumlane Maseko
# This script creates an admin user with full administrative privileges

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Creating Admin User Profile" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "http://localhost:5000/api/Identity"

# Check if API is running
Write-Host "Checking if backend API is running..." -ForegroundColor Yellow
try {
    $testResponse = Invoke-RestMethod -Uri "$apiUrl/users" -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "Connected to API successfully!" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "ERROR: Cannot connect to backend API at $apiUrl" -ForegroundColor Red
    Write-Host "Please make sure the backend server is running first." -ForegroundColor Yellow
    exit 1
}

# Admin user details
$adminUser = @{
    email = "admin@mzansifleet.com"
    phone = "0798395956"
    password = "Password123"
    role = "Admin"
    isActive = $true
    firstName = "Phumlane"
    lastName = "Maseko"
}

Write-Host "Admin User Details:" -ForegroundColor Cyan
Write-Host "  Email:       $($adminUser.email)" -ForegroundColor White
Write-Host "  Phone:       $($adminUser.phone)" -ForegroundColor White
Write-Host "  Name:        $($adminUser.firstName) $($adminUser.lastName)" -ForegroundColor White
Write-Host "  Role:        $($adminUser.role)" -ForegroundColor Yellow
Write-Host ""
Write-Host "NOTE: Using admin@mzansifleet.com as admin email" -ForegroundColor Yellow
Write-Host "      (pcom86@gmail.com already exists as Driver)" -ForegroundColor Gray
Write-Host ""

# Check if user already exists
Write-Host "Checking if user already exists..." -ForegroundColor Yellow
try {
    $existingUsers = Invoke-RestMethod -Uri "$apiUrl/users" -Method GET
    $existingUser = $existingUsers | Where-Object { $_.email -eq $adminUser.email }
    
    if ($existingUser) {
        Write-Host "User with email $($adminUser.email) already exists!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Existing User Details:" -ForegroundColor Cyan
        Write-Host "  User ID:     $($existingUser.id)" -ForegroundColor White
        Write-Host "  Email:       $($existingUser.email)" -ForegroundColor White
        Write-Host "  Role:        $($existingUser.role)" -ForegroundColor White
        Write-Host "  Status:      $(if($existingUser.isActive){'Active'}else{'Inactive'})" -ForegroundColor $(if($existingUser.isActive){'Green'}else{'Red'})
        Write-Host ""
        
        if ($existingUser.role -ne "Admin") {
            Write-Host "WARNING: Existing user has role '$($existingUser.role)' instead of 'Admin'" -ForegroundColor Yellow
            Write-Host "Cannot convert existing user to Admin automatically." -ForegroundColor Yellow
            Write-Host "Please create a new admin user with a different email address." -ForegroundColor Yellow
        } else {
            Write-Host "User already has Admin role." -ForegroundColor Green
            Write-Host ""
            Write-Host "You can use these credentials to login:" -ForegroundColor Green
            Write-Host "  Email:    $($adminUser.email)" -ForegroundColor White
            Write-Host "  Password: Password123" -ForegroundColor White
        }
        
        exit 0
    }
}
catch {
    Write-Host "Error checking existing users: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Get or create default tenant
Write-Host "Getting default tenant..." -ForegroundColor Yellow
try {
    $tenants = Invoke-RestMethod -Uri "$apiUrl/tenants" -Method GET
    $defaultTenant = $tenants | Where-Object { $_.code -like "*DEFAULT*" -or $_.name -like "*Default*" } | Select-Object -First 1
    
    if (-not $defaultTenant) {
        Write-Host "Creating default tenant..." -ForegroundColor Yellow
        $newTenant = @{
            name = "MzansiFleet Administration"
            code = "ADMIN-TENANT"
            address = "Head Office"
            contactPerson = "$($adminUser.firstName) $($adminUser.lastName)"
            phone = $adminUser.phone
            email = $adminUser.email
        } | ConvertTo-Json
        
        $defaultTenant = Invoke-RestMethod -Uri "$apiUrl/tenants" -Method POST -Body $newTenant -ContentType "application/json"
        Write-Host "Default tenant created: $($defaultTenant.name)" -ForegroundColor Green
    } else {
        Write-Host "Using existing tenant: $($defaultTenant.name)" -ForegroundColor Green
    }
    
    Write-Host ""
}
catch {
    Write-Host "Error with tenant: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Create admin user
Write-Host "Creating admin user..." -ForegroundColor Yellow
try {
    $userPayload = @{
        tenantId = $defaultTenant.id
        email = $adminUser.email
        phone = $adminUser.phone
        password = $adminUser.password
        role = "Admin"
        isActive = $true
    } | ConvertTo-Json
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    $createdUser = Invoke-RestMethod -Uri "$apiUrl/users" -Method POST -Body $userPayload -Headers $headers
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Admin User Created Successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "User Details:" -ForegroundColor Cyan
    Write-Host "  User ID:     $($createdUser.id)" -ForegroundColor White
    Write-Host "  Email:       $($createdUser.email)" -ForegroundColor White
    Write-Host "  Phone:       $($createdUser.phone)" -ForegroundColor White
    Write-Host "  Role:        $($createdUser.role)" -ForegroundColor Yellow
    Write-Host "  Tenant:      $($defaultTenant.name)" -ForegroundColor White
    Write-Host "  Status:      Active" -ForegroundColor Green
    Write-Host ""
    Write-Host "Login Credentials:" -ForegroundColor Cyan
    Write-Host "  Email:       $($adminUser.email)" -ForegroundColor White
    Write-Host "  Password:    Password123" -ForegroundColor White
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Navigate to the admin login page" -ForegroundColor White
    Write-Host "  2. Use the credentials above to login" -ForegroundColor White
    Write-Host "  3. Access the admin dashboard to manage the application" -ForegroundColor White
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
}
catch {
    Write-Host ""
    Write-Host "ERROR: Failed to create admin user" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    
    exit 1
}
