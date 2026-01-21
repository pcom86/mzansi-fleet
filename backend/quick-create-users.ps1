# Script to create test users via API
$baseUrl = "http://localhost:5000/api/Identity"

Write-Host "Creating test users for Mzansi Fleet..." -ForegroundColor Cyan
Write-Host ""

$tenantId = "f98ab892-d9d1-432f-8fca-9ef9c00efad7"

# Create Owner user
Write-Host "Creating Owner user..." -ForegroundColor Yellow
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
} catch {
    Write-Host "⚠ Owner user might already exist" -ForegroundColor Yellow
}
Write-Host ""

# Create Renter user
Write-Host "Creating Renter user..." -ForegroundColor Yellow
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
} catch {
    Write-Host "⚠ Renter user might already exist" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "You can now login with:" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Owner: owner@mzansifleet.com / password123" -ForegroundColor White
Write-Host "Renter: renter@mzansifleet.com / password123" -ForegroundColor White
Write-Host ""
