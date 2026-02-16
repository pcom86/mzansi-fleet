# Test TripDetails endpoint
$testData = @{
    vehicleId = "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    routeId = "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    driverId = "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    tripDate = "2026-01-23T00:00:00Z"
    departureTime = "08:00"
    arrivalTime = "10:00"
    passengers = @(
        @{
            name = "John Doe"
            contactNumber = "0123456789"
            nextOfKin = "Jane Doe"
            nextOfKinContact = "0987654321"
            address = "123 Main St"
            destination = "City Center"
            fareAmount = 50
        }
    )
    passengerCount = 1
    totalFare = 50
    notes = "Test trip"
    status = "Completed"
} | ConvertTo-Json -Depth 10

$headers = @{
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/TripDetails" -Method Post -Body $testData -Headers $headers
    Write-Host "Success! Trip created with ID: $($response.id)" -ForegroundColor Green
    Write-Host $response | ConvertTo-Json
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response
}
