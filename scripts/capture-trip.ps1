# Generic Trip Capture Script for Mzansi Fleet
# Usage: .\capture-trip.ps1 -VehicleRegistration "ABC123" -PassengerCount 10

param(
    [Parameter(Mandatory=$true)]
    [string]$VehicleRegistration,

    [Parameter(Mandatory=$true)]
    [int]$PassengerCount,

    [Parameter(Mandatory=$false)]
    [decimal]$BaseFare = 25.00,

    [Parameter(Mandatory=$false)]
    [string]$Notes = "",

    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

Write-Host "=== Mzansi Fleet Trip Capture Script ===" -ForegroundColor Cyan
Write-Host "Vehicle: $VehicleRegistration | Passengers: $PassengerCount" -ForegroundColor Yellow

if ($DryRun) {
    Write-Host "DRY RUN MODE - No actual API calls will be made" -ForegroundColor Yellow
}

Write-Host ""

# Configuration
$baseUrl = "http://localhost:5000/api"

# Step 1: Find the vehicle by registration number
Write-Host "Step 1: Finding vehicle by registration number..." -ForegroundColor Green

try {
    if (-not $DryRun) {
        $vehicles = Invoke-RestMethod -Uri "$baseUrl/Vehicles" -Method Get
        $vehicle = $vehicles | Where-Object { $_.registration -eq $VehicleRegistration }
    } else {
        # Mock vehicle for dry run
        $vehicle = @{
            id = "mock-vehicle-id"
            make = "Mock"
            model = "Vehicle"
            registration = $VehicleRegistration
        }
    }

    if (-not $vehicle) {
        Write-Host "Error: Vehicle with registration '$VehicleRegistration' not found!" -ForegroundColor Red
        exit 1
    }

    Write-Host "Found vehicle: $($vehicle.make) $($vehicle.model) - ID: $($vehicle.id)" -ForegroundColor Green
    $vehicleId = $vehicle.id

} catch {
    Write-Host "Error finding vehicle: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Generate passenger data
Write-Host "Step 2: Generating passenger data..." -ForegroundColor Green

$passengers = @()

for ($i = 1; $i -le $PassengerCount; $i++) {
    $passenger = @{
        name = "Passenger $i"
        contactNumber = "07{0:D8}" -f $i
        nextOfKin = "Next of Kin $i"
        nextOfKinContact = "07{0:D8}" -f ($i + 100)
        address = "Address $i, City"
        destination = "Destination City"
        fareAmount = $BaseFare
    }
    $passengers += $passenger
}

$totalFare = $passengers.Count * $BaseFare
Write-Host "Generated $($passengers.Count) passengers with total fare: R$totalFare" -ForegroundColor Green

# Step 3: Create trip data
Write-Host "Step 3: Creating trip data..." -ForegroundColor Green

$currentDate = Get-Date
$tripData = @{
    vehicleId = $vehicleId
    routeId = $null
    driverId = $null
    tripDate = $currentDate.ToString("yyyy-MM-ddTHH:mm:ssZ")
    departureTime = $currentDate.ToString("HH:mm")
    arrivalTime = $currentDate.AddHours(2).ToString("HH:mm")
    passengers = $passengers
    passengerCount = $passengers.Count
    totalFare = $totalFare
    notes = if ($Notes) { $Notes } else { "Trip captured via automated script - Vehicle $VehicleRegistration with $($passengers.Count) passengers" }
    status = "Completed"
}

Write-Host "Trip details:" -ForegroundColor Cyan
Write-Host "  Date: $($tripData.tripDate)"
Write-Host "  Departure: $($tripData.departureTime)"
Write-Host "  Arrival: $($tripData.arrivalTime)"
Write-Host "  Passengers: $($tripData.passengerCount)"
Write-Host "  Total Fare: R$($tripData.totalFare)"
Write-Host "  Notes: $($tripData.notes)"
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN COMPLETE - Trip data prepared but not submitted" -ForegroundColor Yellow
    Write-Host "Trip JSON:" -ForegroundColor Cyan
    $tripData | ConvertTo-Json -Depth 10
    exit 0
}

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
    Write-Host "Vehicle: $VehicleRegistration" -ForegroundColor Cyan
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