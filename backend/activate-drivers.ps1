# Script to activate all inactive driver accounts
$apiUrl = "http://localhost:5000/api/Identity"

Write-Host "Fetching all driver profiles..." -ForegroundColor Cyan

try {
    # Get all drivers
    $drivers = Invoke-RestMethod -Uri "$apiUrl/driverprofiles" -Method GET
    
    $inactiveDrivers = $drivers | Where-Object { -not $_.isActive }
    
    if ($inactiveDrivers.Count -eq 0) {
        Write-Host "No inactive drivers found!" -ForegroundColor Green
        exit 0
    }
    
    Write-Host "Found $($inactiveDrivers.Count) inactive driver(s)" -ForegroundColor Yellow
    
    foreach ($driver in $inactiveDrivers) {
        Write-Host "`nActivating: $($driver.name) ($($driver.email))..." -ForegroundColor Cyan
        
        # Activate the user account
        try {
            Invoke-RestMethod -Uri "$apiUrl/users/$($driver.userId)/activate" -Method PUT
            Write-Host "  User account activated" -ForegroundColor Green
        } catch {
            Write-Host "  Failed to activate user: $_" -ForegroundColor Red
        }
        
        # Update driver profile to active
        try {
            $updatePayload = @{
                id = $driver.id
                userId = $driver.userId
                name = $driver.name
                idNumber = $driver.idNumber
                phone = $driver.phone
                email = $driver.email
                photoUrl = $driver.photoUrl
                licenseCopy = $driver.licenseCopy
                experience = $driver.experience
                category = $driver.category
                hasPdp = $driver.hasPdp
                pdpCopy = $driver.pdpCopy
                isActive = $true
                isAvailable = $true
                assignedVehicleId = $driver.assignedVehicleId
            } | ConvertTo-Json
            
            Invoke-RestMethod -Uri "$apiUrl/driverprofiles/$($driver.id)" -Method PUT -Body $updatePayload -ContentType "application/json"
            Write-Host "  Driver profile activated" -ForegroundColor Green
        } catch {
            Write-Host "  Failed to activate profile: $_" -ForegroundColor Red
        }
    }
    
    Write-Host "`nAll inactive drivers have been activated!" -ForegroundColor Green
    Write-Host "You can now login with your driver credentials." -ForegroundColor Cyan
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Make sure the backend is running" -ForegroundColor Yellow
}
