# Script to create mass financial data for all vehicles for current month
# Run this from the backend directory

$apiUrl = "http://localhost:5000/api"
$currentMonth = Get-Date -Year 2026 -Month 1 -Day 1
$daysInMonth = 31

Write-Host "Creating mass financial data for January 2026..." -ForegroundColor Cyan

# Get all vehicles
try {
    $vehicles = Invoke-RestMethod -Uri "$apiUrl/Vehicles" -Method Get
    Write-Host "Found $($vehicles.Count) vehicles" -ForegroundColor Green
} catch {
    Write-Host "Error fetching vehicles: $_" -ForegroundColor Red
    exit
}

$earningsSources = @("Trip Fare", "Delivery Fee", "Rental Income", "Bonus", "Tips")
$expenseCategories = @("Fuel", "Maintenance", "Insurance", "Parking", "Tolls", "Car Wash")
$vendors = @("Shell", "BP", "Quick Service", "Auto Care", "City Parking", "Express Wash")

$totalEarnings = 0
$totalExpenses = 0
$successCount = 0
$errorCount = 0

foreach ($vehicle in $vehicles) {
    Write-Host "`nProcessing: $($vehicle.make) $($vehicle.model) - $($vehicle.registration)" -ForegroundColor Yellow
    
    # Create 20-40 earnings entries per vehicle across the month
    $earningsCount = Get-Random -Minimum 20 -Maximum 40
    
    for ($i = 0; $i -lt $earningsCount; $i++) {
        $day = Get-Random -Minimum 1 -Maximum 6  # Only days 1-5 for current data
        $date = Get-Date -Year 2026 -Month 1 -Day $day
        $amount = Get-Random -Minimum 150 -Maximum 1200
        $source = $earningsSources | Get-Random
        
        $earning = @{
            vehicleId = $vehicle.id
            amount = $amount
            source = $source
            description = "$source for $($vehicle.registration)"
            date = $date.ToString("yyyy-MM-dd")
            period = "January 2026"
        }
        
        try {
            $null = Invoke-RestMethod -Uri "$apiUrl/VehicleEarnings" -Method Post -Body ($earning | ConvertTo-Json) -ContentType "application/json"
            $totalEarnings += $amount
            $successCount++
        } catch {
            Write-Host "  Error creating earning: $_" -ForegroundColor Red
            $errorCount++
        }
    }
    
    # Create 15-30 expense entries per vehicle across the month
    $expensesCount = Get-Random -Minimum 15 -Maximum 30
    
    for ($i = 0; $i -lt $expensesCount; $i++) {
        $day = Get-Random -Minimum 1 -Maximum 6  # Only days 1-5 for current data
        $date = Get-Date -Year 2026 -Month 1 -Day $day
        $amount = Get-Random -Minimum 50 -Maximum 800
        $category = $expenseCategories | Get-Random
        $vendor = $vendors | Get-Random
        
        $expense = @{
            vehicleId = $vehicle.id
            amount = $amount
            category = $category
            vendor = $vendor
            description = "$category at $vendor"
            date = $date.ToString("yyyy-MM-dd")
            invoiceNumber = "INV-$(Get-Random -Minimum 10000 -Maximum 99999)"
        }
        
        try {
            $null = Invoke-RestMethod -Uri "$apiUrl/VehicleExpenses" -Method Post -Body ($expense | ConvertTo-Json) -ContentType "application/json"
            $totalExpenses += $amount
            $successCount++
        } catch {
            Write-Host "  Error creating expense: $_" -ForegroundColor Red
            $errorCount++
        }
    }
    
    Write-Host "  Created ~$earningsCount earnings and ~$expensesCount expenses" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Mass Data Creation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Vehicles Processed: $($vehicles.Count)" -ForegroundColor White
Write-Host "Total Earnings: R$($totalEarnings.ToString('N2'))" -ForegroundColor Green
Write-Host "Total Expenses: R$($totalExpenses.ToString('N2'))" -ForegroundColor Red
Write-Host "Net Profit: R$(($totalEarnings - $totalExpenses).ToString('N2'))" -ForegroundColor $(if ($totalEarnings -gt $totalExpenses) { 'Green' } else { 'Red' })
Write-Host "Successful Operations: $successCount" -ForegroundColor Green
Write-Host "Failed Operations: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { 'Red' } else { 'Green' })
Write-Host "========================================`n" -ForegroundColor Cyan
