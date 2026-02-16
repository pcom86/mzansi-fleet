# Script to capture a taxi rank trip for vehicle FG79FFGP with 15 passengers
# This script creates a Trip record linked to the Dundonald Taxi Rank through vehicle association

Write-Host "=== Mzansi Fleet Taxi Rank Trip Capture Script ===" -ForegroundColor Cyan
Write-Host "Vehicle: FG79FFGP | Passengers: 15 | Taxi Rank: Dundonald" -ForegroundColor Yellow
Write-Host ""

# Configuration
$baseUrl = "http://localhost:5000/api"
$vehicleRegistration = "FG79FFGP"
$vehicleId = "45bcf3ca-5a96-4c10-a2b5-1ae720a851ad"  # Toyota Quantum
$taxiRankId = "76afaa8c-6fde-46b5-a9a9-e3559943b681"  # Dundonald Taxi Rank
$tenantId = "edfed825-c3e2-4384-99fe-3cb3acfa51af"    # Kangwane Swazi Taxi Association

# Step 1: Verify vehicle exists
Write-Host "Step 1: Verifying vehicle..." -ForegroundColor Green

try {
    $vehicles = Invoke-RestMethod -Uri "$baseUrl/Vehicles" -Method Get
    $vehicle = $vehicles | Where-Object { $_.id -eq $vehicleId }

    if (-not $vehicle) {
        Write-Host "Error: Vehicle with ID '$vehicleId' not found!" -ForegroundColor Red
        exit 1
    }

    Write-Host "Found vehicle: $($vehicle.make) $($vehicle.model) - $($vehicle.registration)" -ForegroundColor Green

} catch {
    Write-Host "Error verifying vehicle: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Verify taxi rank exists
Write-Host "Step 2: Verifying taxi rank..." -ForegroundColor Green

try {
    $taxiRank = Invoke-RestMethod -Uri "$baseUrl/TaxiRanks/$taxiRankId" -Method Get

    if (-not $taxiRank) {
        Write-Host "Error: Taxi rank with ID '$taxiRankId' not found!" -ForegroundColor Red
        exit 1
    }

    Write-Host "Found taxi rank: $($taxiRank.name) - $($taxiRank.city)" -ForegroundColor Green

} catch {
    Write-Host "Error verifying taxi rank: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Generate passenger data for 15 passengers
Write-Host "Step 3: Generating passenger data..." -ForegroundColor Green

$passengers = @()
$baseFare = 25.00  # Base fare per passenger

for ($i = 1; $i -le 15; $i++) {
    $passenger = @{
        passengerName = "Passenger $i"
        passengerPhone = "07{0:D8}" -f $i  # Generate phone numbers like 070000001, 070000002, etc.
        departureStation = "Dundonald"
        arrivalStation = "Johannesburg"
        amount = $baseFare
        seatNumber = $i
        notes = "Trip from Dundonald to Johannesburg"
    }
    $passengers += $passenger
}

$totalFare = $passengers.Count * $baseFare
Write-Host "Generated $($passengers.Count) passengers with total fare: R$totalFare" -ForegroundColor Green

# Step 4: Create trip data for TripDetails endpoint
Write-Host "Step 4: Creating trip data..." -ForegroundColor Green

$currentDate = Get-Date
$tripData = @{
    vehicleId = $vehicleId
    tripDate = $currentDate.ToString("yyyy-MM-ddTHH:mm:ssZ")
    departureTime = $currentDate.ToString("HH:mm")
    passengerCount = $passengers.Count
    totalFare = $totalFare
    status = "Completed"
    notes = "Taxi rank trip captured via automated script - Vehicle $vehicleRegistration with $($passengers.Count) passengers linked to Dundonald Taxi Rank"
    passengers = $passengers | ForEach-Object {
        @{
            name = $_.passengerName
            contactNumber = $_.passengerPhone
            destination = $_.arrivalStation
            fareAmount = $_.amount
        }
    }
}

Write-Host "Trip details:" -ForegroundColor Cyan
Write-Host "  Vehicle: $vehicleRegistration ($($vehicle.make) $($vehicle.model))"
Write-Host "  Taxi Rank: $($taxiRank.name) (linked via vehicle association)"
Write-Host "  Trip Date: $($tripData.tripDate)"
Write-Host "  Departure Time: $($tripData.departureTime)"
Write-Host "  Passengers: $($passengers.Count)"
Write-Host "  Total Fare: R$totalFare"
Write-Host ""

# Step 5: Create the trip using TripDetails endpoint
Write-Host "Step 5: Creating trip..." -ForegroundColor Green

$jsonData = $tripData | ConvertTo-Json -Depth 10

$headers = @{
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/TripDetails" -Method Post -Body $jsonData -Headers $headers

    Write-Host "SUCCESS! Trip created successfully!" -ForegroundColor Green
    Write-Host "Trip ID: $($response.id)" -ForegroundColor Cyan
    Write-Host "Vehicle: $vehicleRegistration" -ForegroundColor Cyan
    Write-Host "Taxi Rank: $($taxiRank.name) (linked via vehicle)" -ForegroundColor Cyan
    Write-Host "Trip Date: $($response.tripDate)" -ForegroundColor Cyan
    Write-Host "Status: $($response.status)" -ForegroundColor Cyan

    $tripId = $response.id

} catch {
    Write-Host "Error creating trip: $_" -ForegroundColor Red
    exit 1
}

# Step 6: Verify the trip
Write-Host "Step 6: Verifying the created trip..." -ForegroundColor Green

try {
    $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/TripDetails/$tripId" -Method Get

    Write-Host "Trip verification:" -ForegroundColor Cyan
    Write-Host "  Trip ID: $($verifyResponse.id)"
    Write-Host "  Vehicle: $($vehicle.registration)"
    Write-Host "  Trip Date: $($verifyResponse.tripDate)"
    Write-Host "  Passengers: $($verifyResponse.passengerCount)"
    Write-Host "  Total Fare: R$($verifyResponse.totalFare)"
    Write-Host "  Status: $($verifyResponse.status)"

} catch {
    Write-Host "Error verifying trip: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Taxi rank trip capture completed successfully!" -ForegroundColor Green
Write-Host "Trip is now linked to the Dundonald Taxi Rank through vehicle association and ready for management." -ForegroundColor Green