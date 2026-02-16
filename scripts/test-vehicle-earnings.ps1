# Test VehicleEarnings endpoint
$testEarnings = @{
    vehicleId = "45bcf3ca-5a96-4c10-a2b5-1ae720a851ad"
    amount = 150.50
    date = "2026-01-09T00:00:00Z"
    source = "Trip"
    description = "Test trip earnings - 3 passengers"
    period = "Daily"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "Testing VehicleEarnings POST endpoint..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/VehicleEarnings" -Method Post -Body $testEarnings -Headers $headers
    Write-Host "✓ Success! Earnings created:" -ForegroundColor Green
    Write-Host "  ID: $($response.id)" -ForegroundColor White
    Write-Host "  Vehicle ID: $($response.vehicleId)" -ForegroundColor White
    Write-Host "  Amount: R$($response.amount)" -ForegroundColor White
    Write-Host "  Source: $($response.source)" -ForegroundColor White
    Write-Host "  Description: $($response.description)" -ForegroundColor White
    
    Write-Host "`nNow fetching earnings for this vehicle..." -ForegroundColor Cyan
    $startDate = "2026-01-01"
    $endDate = "2026-01-31"
    $earnings = Invoke-RestMethod -Uri "http://localhost:5000/api/VehicleEarnings/vehicle/$($response.vehicleId)/period?startDate=$startDate&endDate=$endDate" -Method Get
    
    Write-Host "✓ Found $($earnings.Count) earning(s) for this vehicle in January 2026" -ForegroundColor Green
    foreach ($e in $earnings) {
        Write-Host "  - $(Get-Date $e.date -Format 'yyyy-MM-dd'): R$($e.amount) ($($e.description))" -ForegroundColor White
    }
}
catch {
    Write-Host "✗ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
}
