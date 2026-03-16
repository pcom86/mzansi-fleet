# Mobile Queue Management Test Script
# Tests the enhanced queue management features on the mobile app

Write-Host "Mobile Queue Management Test Suite" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Configuration
$ApiBaseUrl = "http://192.168.68.107:5000/api" # Mobile app API URL from app.json
$TestTaxiRankId = "00000000-0000-0000-0000-000000000001" # Replace with actual taxi rank ID
$TestTenantId = "00000000-0000-0000-0000-000000000001"   # Replace with actual tenant ID

Write-Host "Testing Mobile Queue Management Features..." -ForegroundColor Yellow
Write-Host "API Base URL: $ApiBaseUrl" -ForegroundColor White
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
        }
        return $null
    }
}

# Test 1: Enhanced Queue Overview
Write-Host "Test 1: Enhanced Queue Overview" -ForegroundColor Green
$today = Get-Date -Format "yyyy-MM-dd"
$queueOverview = Invoke-ApiRequest -Method "GET" -Endpoint "/QueueManagement/overview/$TestTaxiRankId?date=$today"

if ($queueOverview) {
    Write-Host "✓ Enhanced queue overview retrieved successfully" -ForegroundColor Green
    Write-Host "  - Taxi Rank ID: $($queueOverview.taxiRankId)" -ForegroundColor White
    Write-Host "  - Date: $($queueOverview.date)" -ForegroundColor White
    Write-Host "  - Route Queues: $($queueOverview.routeQueues.Count)" -ForegroundColor White
    Write-Host "  - Total Stats: Waiting=$($queueOverview.totalStats.waiting), Dispatched=$($queueOverview.totalStats.dispatched)" -ForegroundColor White
} else {
    Write-Host "✗ Failed to get enhanced queue overview" -ForegroundColor Red
}
Write-Host ""

# Test 2: Available Vehicles for Assignment
Write-Host "Test 2: Available Vehicles for Assignment" -ForegroundColor Green
$availableVehicles = Invoke-ApiRequest -Method "GET" -Endpoint "/QueueManagement/vehicle-availability/$TestTaxiRankId"

if ($availableVehicles) {
    Write-Host "✓ Available vehicles retrieved successfully" -ForegroundColor Green
    Write-Host "  - Found $($availableVehicles.Count) available vehicles" -ForegroundColor White
    
    if ($availableVehicles.Count -gt 0) {
        Write-Host "  - Sample vehicle: $($availableVehicles[0].registration) - $($availableVehicles[0].currentStatus)" -ForegroundColor White
    }
} else {
    Write-Host "✗ Failed to get available vehicles" -ForegroundColor Red
}
Write-Host ""

# Test 3: Queue Analytics
Write-Host "Test 3: Queue Analytics" -ForegroundColor Green
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
    Write-Host "  - Daily trends entries: $($analytics.dailyTrends.Count)" -ForegroundColor White
} else {
    Write-Host "✗ Failed to get queue analytics" -ForegroundColor Red
}
Write-Host ""

# Test 4: Enhanced Vehicle Assignment
if ($availableVehicles -and $availableVehicles.Count -gt 0) {
    Write-Host "Test 4: Enhanced Vehicle Assignment" -ForegroundColor Green
    
    $assignment = @{
        taxiRankId = $TestTaxiRankId
        routeId = $null # Assign to general queue
        vehicleId = $availableVehicles[0].vehicleId
        driverId = $null
        tenantId = $TestTenantId
        notes = "Mobile app test assignment"
    }
    
    $assignResult = Invoke-ApiRequest -Method "POST" -Endpoint "/QueueManagement/assign-vehicle" -Body $assignment
    
    if ($assignResult) {
        Write-Host "✓ Vehicle assigned using enhanced API" -ForegroundColor Green
        Write-Host "  - Queue ID: $($assignResult.id)" -ForegroundColor White
        Write-Host "  - Message: $($assignResult.message)" -ForegroundColor White
    } else {
        Write-Host "✗ Failed to assign vehicle using enhanced API" -ForegroundColor Red
    }
} else {
    Write-Host "Test 4: Enhanced Vehicle Assignment - SKIPPED (no available vehicles)" -ForegroundColor Yellow
}
Write-Host ""

# Test 5: Mobile App API Compatibility
Write-Host "Test 5: Mobile App API Compatibility" -ForegroundColor Green

# Test original queue endpoints (for backward compatibility)
$originalQueue = Invoke-ApiRequest -Method "GET" -Endpoint "/DailyTaxiQueue/by-rank/$TestTaxiRankId?date=$today"
$originalStats = Invoke-ApiRequest -Method "GET" -Endpoint "/DailyTaxiQueue/stats/$TestTaxiRankId?date=$today"

if ($originalQueue -and $originalStats) {
    Write-Host "✓ Original queue API endpoints working (backward compatibility)" -ForegroundColor Green
    Write-Host "  - Queue entries: $($originalQueue.Count)" -ForegroundColor White
    Write-Host "  - Stats available: $($originalStats -ne $null)" -ForegroundColor White
} else {
    Write-Host "✗ Original queue API endpoints not working" -ForegroundColor Red
}
Write-Host ""

# Test 6: Data Format Validation
Write-Host "Test 6: Data Format Validation for Mobile App" -ForegroundColor Green

if ($queueOverview) {
    $validationPassed = $true
    
    # Check required fields for mobile app
    if (-not $queueOverview.taxiRankId) {
        Write-Host "  ✗ Missing taxiRankId" -ForegroundColor Red
        $validationPassed = $false
    }
    
    if (-not $queueOverview.routeQueues -or $queueOverview.routeQueues.Count -eq 0) {
        Write-Host "  ✗ No route queues data" -ForegroundColor Red
        $validationPassed = $false
    }
    
    if (-not $queueOverview.totalStats) {
        Write-Host "  ✗ Missing totalStats" -ForegroundColor Red
        $validationPassed = $false
    }
    
    # Check route queue structure
    if ($queueOverview.routeQueues) {
        foreach ($routeQueue in $queueOverview.routeQueues) {
            if (-not $routeQueue.totalVehicles) {
                Write-Host "  ✗ Route queue missing totalVehicles" -ForegroundColor Red
                $validationPassed = $false
            }
            
            if (-not $routeQueue.nextVehicle -and $routeQueue.waitingVehicles -gt 0) {
                Write-Host "  ⚠ Route queue has waiting vehicles but no nextVehicle data" -ForegroundColor Yellow
            }
        }
    }
    
    if ($validationPassed) {
        Write-Host "✓ Data format validation passed for mobile app" -ForegroundColor Green
    } else {
        Write-Host "✗ Data format validation failed" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Cannot validate data format - no queue overview data" -ForegroundColor Red
}
Write-Host ""

# Test 7: Mobile App Performance Considerations
Write-Host "Test 7: Mobile App Performance Considerations" -ForegroundColor Green

$startTime = Get-Date
$performanceTest = Invoke-ApiRequest -Method "GET" -Endpoint "/QueueManagement/overview/$TestTaxiRankId?date=$today"
$endTime = Get-Date
$responseTime = ($endTime - $startTime).TotalMilliseconds

if ($performanceTest) {
    Write-Host "✓ API response time: $([math]::Round($responseTime, 2))ms" -ForegroundColor Green
    
    if ($responseTime -lt 1000) {
        Write-Host "  ✓ Good performance for mobile app" -ForegroundColor Green
    } elseif ($responseTime -lt 3000) {
        Write-Host "  ⚠ Acceptable performance for mobile app" -ForegroundColor Yellow
    } else {
        Write-Host "  ✗ Poor performance for mobile app (slow)" -ForegroundColor Red
    }
    
    # Check data size (important for mobile)
    $dataSize = [System.Text.Encoding]::UTF8.GetByteCount(($performanceTest | ConvertTo-Json -Depth 10))
    Write-Host "  - Response data size: $([math]::Round($dataSize / 1024, 2))KB" -ForegroundColor White
    
    if ($dataSize -lt 50000) { # Less than 50KB
        Write-Host "  ✓ Good data size for mobile networks" -ForegroundColor Green
    } elseif ($dataSize -lt 200000) { # Less than 200KB
        Write-Host "  ⚠ Acceptable data size for mobile networks" -ForegroundColor Yellow
    } else {
        Write-Host "  ✗ Large data size - may impact mobile performance" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Cannot measure performance - API call failed" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "Mobile Queue Management Test Summary" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Enhanced Features Tested:" -ForegroundColor White
Write-Host "  • Enhanced queue overview with route breakdown" -ForegroundColor White
Write-Host "  • Available vehicles for assignment" -ForegroundColor White
Write-Host "  • Queue analytics and reporting" -ForegroundColor White
Write-Host "  • Enhanced vehicle assignment API" -ForegroundColor White
Write-Host "  • Backward compatibility with original endpoints" -ForegroundColor White
Write-Host "  • Data format validation for mobile app" -ForegroundColor White
Write-Host "  • Performance considerations for mobile networks" -ForegroundColor White
Write-Host ""
Write-Host "Mobile App Integration:" -ForegroundColor White
Write-Host "  • EnhancedQueueManagementScreen.js - Main queue interface" -ForegroundColor White
Write-Host "  • QueueAnalyticsScreen.js - Analytics dashboard" -ForegroundColor White
Write-Host "  • queueRealtimeService.js - Real-time updates (polling)" -ForegroundColor White
Write-Host "  • Enhanced queueManagement.js API service" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps for Mobile App:" -ForegroundColor Yellow
Write-Host "  1. Update navigation to use EnhancedQueueManagementScreen" -ForegroundColor Yellow
Write-Host "  2. Test real-time updates with actual WebSocket/SignalR" -ForegroundColor Yellow
Write-Host "  3. Add push notifications for priority dispatches" -ForegroundColor Yellow
Write-Host "  4. Implement offline queue management capabilities" -ForegroundColor Yellow
Write-Host "  5. Add barcode/QR scanning for vehicle identification" -ForegroundColor Yellow
Write-Host ""
Write-Host "Mobile Queue Management System Test Complete!" -ForegroundColor Green
