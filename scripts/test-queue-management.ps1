# Queue Management System Test Script
# Tests all the queue management functionality

Write-Host "Queue Management System Test Suite" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Configuration
$ApiBaseUrl = "http://localhost:5000/api"
$TestTaxiRankId = "00000000-0000-0000-0000-000000000001" # Replace with actual taxi rank ID
$TestTenantId = "00000000-0000-0000-0000-000000000001"   # Replace with actual tenant ID

# Test Data
$TestVehicleId = $null
$TestDriverId = $null
$TestRouteId = $null
$TestQueueId = $null

Write-Host "Starting Queue Management Tests..." -ForegroundColor Yellow
Write-Host ""

# Function to make HTTP requests
function Invoke-ApiRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body
    )
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        $params = @{
            Method = $Method
            Uri = "$ApiBaseUrl$Endpoint"
            Headers = $headers
        }
        
        if ($Body) {
            $params.Body = $Body | ConvertTo-Json -Depth 10
        }
        
        $response = Invoke-RestMethod @params
        return $response
    }
    catch {
        Write-Host "API Request Failed: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
            Write-Host "Content: $($_.Exception.Response.GetResponseStream().ToString())" -ForegroundColor Red
        }
        return $null
    }
}

# Test 1: Get Queue Overview
Write-Host "Test 1: Get Queue Overview" -ForegroundColor Green
$today = Get-Date -Format "yyyy-MM-dd"
$queueOverview = Invoke-ApiRequest -Method "GET" -Endpoint "/QueueManagement/overview/$TestTaxiRankId?date=$today"

if ($queueOverview) {
    Write-Host "✓ Queue overview retrieved successfully" -ForegroundColor Green
    Write-Host "  - Taxi Rank ID: $($queueOverview.taxiRankId)" -ForegroundColor White
    Write-Host "  - Date: $($queueOverview.date)" -ForegroundColor White
    Write-Host "  - Total Stats: $($queueOverview.totalStats.waiting) waiting, $($queueOverview.totalStats.dispatched) dispatched" -ForegroundColor White
} else {
    Write-Host "✗ Failed to get queue overview" -ForegroundColor Red
}
Write-Host ""

# Test 2: Get Available Vehicles
Write-Host "Test 2: Get Available Vehicles" -ForegroundColor Green
$availableVehicles = Invoke-ApiRequest -Method "GET" -Endpoint "/QueueManagement/vehicle-availability/$TestTaxiRankId"

if ($availableVehicles) {
    Write-Host "✓ Available vehicles retrieved successfully" -ForegroundColor Green
    Write-Host "  - Found $($availableVehicles.Count) available vehicles" -ForegroundColor White
    
    if ($availableVehicles.Count -gt 0) {
        $TestVehicleId = $availableVehicles[0].vehicleId
        Write-Host "  - Selected test vehicle: $($availableVehicles[0].registration)" -ForegroundColor White
    }
} else {
    Write-Host "✗ Failed to get available vehicles" -ForegroundColor Red
}
Write-Host ""

# Test 3: Get Available Drivers (using existing endpoint)
Write-Host "Test 3: Get Available Drivers" -ForegroundColor Green
$drivers = Invoke-ApiRequest -Method "GET" -Endpoint "/DriverProfiles"

if ($drivers) {
    Write-Host "✓ Drivers retrieved successfully" -ForegroundColor Green
    Write-Host "  - Found $($drivers.Count) drivers" -ForegroundColor White
    
    if ($drivers.Count -gt 0) {
        $TestDriverId = $drivers[0].id
        Write-Host "  - Selected test driver: $($drivers[0].name)" -ForegroundColor White
    }
} else {
    Write-Host "✗ Failed to get drivers" -ForegroundColor Red
}
Write-Host ""

# Test 4: Get Available Routes
Write-Host "Test 4: Get Available Routes" -ForegroundColor Green
$routes = Invoke-ApiRequest -Method "GET" -Endpoint "/Routes"

if ($routes) {
    Write-Host "✓ Routes retrieved successfully" -ForegroundColor Green
    Write-Host "  - Found $($routes.Count) routes" -ForegroundColor White
    
    if ($routes.Count -gt 0) {
        $TestRouteId = $routes[0].id
        Write-Host "  - Selected test route: $($routes[0].routeName)" -ForegroundColor White
    }
} else {
    Write-Host "✗ Failed to get routes" -ForegroundColor Red
}
Write-Host ""

# Test 5: Assign Vehicle to Queue (only if we have test data)
if ($TestVehicleId -and $TestTaxiRankId -and $TestTenantId) {
    Write-Host "Test 5: Assign Vehicle to Queue" -ForegroundColor Green
    
    $assignment = @{
        taxiRankId = $TestTaxiRankId
        routeId = $TestRouteId
        vehicleId = $TestVehicleId
        driverId = $TestDriverId
        tenantId = $TestTenantId
        notes = "Test assignment from PowerShell script"
    }
    
    $assignResult = Invoke-ApiRequest -Method "POST" -Endpoint "/QueueManagement/assign-vehicle" -Body $assignment
    
    if ($assignResult) {
        Write-Host "✓ Vehicle assigned to queue successfully" -ForegroundColor Green
        Write-Host "  - Queue ID: $($assignResult.id)" -ForegroundColor White
        $TestQueueId = $assignResult.id
    } else {
        Write-Host "✗ Failed to assign vehicle to queue" -ForegroundColor Red
    }
} else {
    Write-Host "Test 5: Assign Vehicle to Queue - SKIPPED (missing test data)" -ForegroundColor Yellow
}
Write-Host ""

# Test 6: Get Updated Queue Overview
if ($TestQueueId) {
    Write-Host "Test 6: Get Updated Queue Overview" -ForegroundColor Green
    $updatedOverview = Invoke-ApiRequest -Method "GET" -Endpoint "/QueueManagement/overview/$TestTaxiRankId?date=$today"
    
    if ($updatedOverview) {
        Write-Host "✓ Updated queue overview retrieved successfully" -ForegroundColor Green
        Write-Host "  - Total vehicles in queue: $($updatedOverview.totalStats.waiting + $updatedOverview.totalStats.loading)" -ForegroundColor White
    } else {
        Write-Host "✗ Failed to get updated queue overview" -ForegroundColor Red
    }
} else {
    Write-Host "Test 6: Get Updated Queue Overview - SKIPPED (no queue entry created)" -ForegroundColor Yellow
}
Write-Host ""

# Test 7: Priority Dispatch Vehicle
if ($TestQueueId) {
    Write-Host "Test 7: Priority Dispatch Vehicle" -ForegroundColor Green
    
    $dispatchData = @{
        dispatchedByUserId = $null
        passengerCount = 15
        priority = "High"
        reason = "Test priority dispatch"
    }
    
    $dispatchResult = Invoke-ApiRequest -Method "PUT" -Endpoint "/QueueManagement/priority-dispatch/$TestQueueId" -Body $dispatchData
    
    if ($dispatchResult) {
        Write-Host "✓ Vehicle dispatched successfully" -ForegroundColor Green
        Write-Host "  - Message: $($dispatchResult.message)" -ForegroundColor White
    } else {
        Write-Host "✗ Failed to dispatch vehicle" -ForegroundColor Red
    }
} else {
    Write-Host "Test 7: Priority Dispatch Vehicle - SKIPPED (no queue entry created)" -ForegroundColor Yellow
}
Write-Host ""

# Test 8: Get Queue Analytics
Write-Host "Test 8: Get Queue Analytics" -ForegroundColor Green
$startDate = (Get-Date).AddDays(-7).ToString("yyyy-MM-dd")
$endDate = (Get-Date).ToString("yyyy-MM-dd")
$analytics = Invoke-ApiRequest -Method "GET" -Endpoint "/QueueManagement/analytics/$TestTaxiRankId?startDate=$startDate&endDate=$endDate"

if ($analytics) {
    Write-Host "✓ Queue analytics retrieved successfully" -ForegroundColor Green
    Write-Host "  - Period: $($analytics.periodStart) to $($analytics.periodEnd)" -ForegroundColor White
    Write-Host "  - Total vehicles processed: $($analytics.totalVehiclesProcessed)" -ForegroundColor White
    Write-Host "  - Average queue length: $($analytics.averageQueueLength)" -ForegroundColor White
    Write-Host "  - Average wait time: $($analytics.averageWaitTime) minutes" -ForegroundColor White
    Write-Host "  - Peak hours count: $($analytics.peakHours.Count)" -ForegroundColor White
    Write-Host "  - Route performance entries: $($analytics.routePerformance.Count)" -ForegroundColor White
} else {
    Write-Host "✗ Failed to get queue analytics" -ForegroundColor Red
}
Write-Host ""

# Test 9: Test SignalR Connection (Basic connectivity test)
Write-Host "Test 9: Test SignalR Hub Connectivity" -ForegroundColor Green
try {
    $hubUrl = "$ApiBaseUrl/queueHub"
    $response = Invoke-WebRequest -Uri $hubUrl -Method GET -TimeoutSec 5
    Write-Host "✓ SignalR hub endpoint accessible" -ForegroundColor Green
} catch {
    Write-Host "✗ SignalR hub endpoint not accessible" -ForegroundColor Red
    Write-Host "  Note: This is expected if the server is not running or SignalR is not properly configured" -ForegroundColor Yellow
}
Write-Host ""

# Test 10: Test Original DailyTaxiQueueController
Write-Host "Test 10: Test Original DailyTaxiQueueController" -ForegroundColor Green
$originalQueue = Invoke-ApiRequest -Method "GET" -Endpoint "/DailyTaxiQueue/by-rank/$TestTaxiRankId?date=$today"

if ($originalQueue) {
    Write-Host "✓ Original queue controller working" -ForegroundColor Green
    Write-Host "  - Found $($originalQueue.Count) queue entries" -ForegroundColor White
} else {
    Write-Host "✗ Failed to access original queue controller" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "Test Suite Summary" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host "Queue Management System tests completed." -ForegroundColor White
Write-Host ""
Write-Host "Key Features Tested:" -ForegroundColor White
Write-Host "  • Queue overview and statistics" -ForegroundColor White
Write-Host "  • Vehicle availability checking" -ForegroundColor White
Write-Host "  • Vehicle assignment to queue" -ForegroundColor White
Write-Host "  • Priority dispatch functionality" -ForegroundColor White
Write-Host "  • Queue analytics and reporting" -ForegroundColor White
Write-Host "  • SignalR hub connectivity" -ForegroundColor White
Write-Host "  • Legacy queue controller compatibility" -ForegroundColor White
Write-Host ""
Write-Host "Note: Some tests require actual data in the database." -ForegroundColor Yellow
Write-Host "Update the TestTaxiRankId and TestTenantId variables with real values." -ForegroundColor Yellow
Write-Host ""

# Cleanup (optional)
if ($TestQueueId) {
    Write-Host "Cleanup: Remove test queue entry?" -ForegroundColor Yellow
    $choice = Read-Host "Remove test queue entry? (y/N)"
    if ($choice -eq 'y' -or $choice -eq 'Y') {
        $removeResult = Invoke-ApiRequest -Method "PUT" -Endpoint "/DailyTaxiQueue/$TestQueueId/remove"
        if ($removeResult) {
            Write-Host "✓ Test queue entry removed" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed to remove test queue entry" -ForegroundColor Red
        }
    }
}

Write-Host "Queue Management System Test Suite Complete!" -ForegroundColor Green
