# Script to capture a trip for vehicle FG79FFGP with 15 passengers
# This script creates a completed trip record in the Mzansi Fleet system

Write-Host "=== Mzansi Fleet Trip Capture Script ===" -ForegroundColor Cyan
Write-Host "Vehicle: FG79FFGP | Passengers: 15" -ForegroundColor Yellow
Write-Host ""

# Configuration
$baseUrl = "http://localhost:5000/api"
$vehicleRegistration = "FG79FFGP"

# Step 1: Find the vehicle by registration number
Write-Host "Step 1: Finding vehicle by registration number..." -ForegroundColor Green

try {
    $vehicles = Invoke-RestMethod -Uri "$baseUrl/Vehicles" -Method Get
    $vehicle = $vehicles | Where-Object { $_.registration -eq $vehicleRegistration }

    if (-not $vehicle) {
        Write-Host "Error: Vehicle with registration '$vehicleRegistration' not found!" -ForegroundColor Red
        exit 1
    }

    Write-Host "Found vehicle: $($vehicle.make) $($vehicle.model) - ID: $($vehicle.id)" -ForegroundColor Green
    $vehicleId = $vehicle.id

} catch {
    Write-Host "Error finding vehicle: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Generate passenger data for 15 passengers
Write-Host "Step 2: Generating passenger data..." -ForegroundColor Green

$passengers = @()
$baseFare = 25.00  # Base fare per passenger

for ($i = 1; $i -le 15; $i++) {
    $passenger = @{
        name = "Passenger $i"
        contactNumber = "07{0:D8}" -f $i  # Generate phone numbers like 070000001, 070000002, etc.
        nextOfKin = "Next of Kin $i"
        nextOfKinContact = "07{0:D8}" -f ($i + 100)  # Different numbers for next of kin
        address = "Address $i, City"
        destination = "Destination City"
        fareAmount = $baseFare
    }
    $passengers += $passenger
}

$totalFare = $passengers.Count * $baseFare
Write-Host "Generated $($passengers.Count) passengers with total fare: R$totalFare" -ForegroundColor Green

# Step 3: Create trip data
Write-Host "Step 3: Creating trip data..." -ForegroundColor Green

$currentDate = Get-Date
$tripData = @{
    vehicleId = $vehicleId
    routeId = $null  # No specific route for this trip
    driverId = $null  # Owner-driven trip
    tripDate = $currentDate.ToString("yyyy-MM-ddTHH:mm:ssZ")
    departureTime = $currentDate.ToString("HH:mm")
    arrivalTime = $currentDate.AddHours(2).ToString("HH:mm")  # 2-hour trip
    passengers = $passengers
    passengerCount = $passengers.Count
    totalFare = $totalFare
    notes = "Trip captured via automated script - Vehicle $vehicleRegistration with $($passengers.Count) passengers"
    status = "Completed"
}

Write-Host "Trip details:" -ForegroundColor Cyan
Write-Host "  Date: $($tripData.tripDate)"
Write-Host "  Departure: $($tripData.departureTime)"
Write-Host "  Arrival: $($tripData.arrivalTime)"
Write-Host "  Passengers: $($tripData.passengerCount)"
Write-Host "  Total Fare: R$($tripData.totalFare)"
Write-Host ""

# Step 4: Submit trip to API
Write-Host "Step 4: Submitting trip to API..." -ForegroundColor Green

$jsonData = $tripData | ConvertTo-Json -Depth 10

$headers = @{
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/TripDetails" -Method Post -Body $jsonData -Headers $headers

    Write-Host "SUCCESS! Trip created successfully!" -ForegroundColor Green
    Write-Host "Trip ID: $($response.id)" -ForegroundColor Cyan
    Write-Host "Vehicle: $vehicleRegistration" -ForegroundColor Cyan
    Write-Host "Passengers: $($response.passengerCount)" -ForegroundColor Cyan
    Write-Host "Total Fare: R$($response.totalFare)" -ForegroundColor Cyan
    Write-Host "Status: $($response.status)" -ForegroundColor Cyan

    Write-Host ""
    Write-Host "Trip capture completed successfully!" -ForegroundColor Green

} catch {
    Write-Host "ERROR: Failed to create trip!" -ForegroundColor Red
    Write-Host "Error details: $_" -ForegroundColor Red

    if ($_.Exception.Response) {
        try {
            $errorResponse = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorResponse)
            $errorContent = $reader.ReadToEnd()
            Write-Host "API Response: $errorContent" -ForegroundColor Yellow
        } catch {
            Write-Host "Could not read error response details" -ForegroundColor Yellow
        }
    }

    exit 1
}

Write-Host ""
Write-Host "Script execution completed." -ForegroundColor Cyan