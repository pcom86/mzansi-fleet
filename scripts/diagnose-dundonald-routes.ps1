# Dundonald Taxi Rank Route Diagnosis Script
# Helps identify and fix routes incorrectly linked to Dundonald Taxi Rank

param(
    [string]$TaxiRankName = "Dundonald Taxi Rank",
    [string]$ConnectionString = "Host=localhost;Database=mzansifleet;Username=postgres;Password=password"
)

Write-Host "Dundonald Taxi Rank Route Diagnosis" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

Write-Host "This script will help identify routes incorrectly linked to $TaxiRankName" -ForegroundColor Yellow
Write-Host ""

# First, let's find the TaxiRankId for Dundonald Taxi Rank
Write-Host "Step 1: Finding Dundonald Taxi Rank ID..." -ForegroundColor White

$findRankQuery = @"
SELECT id, name, 'taxi_rank_info' as info 
FROM taxi_ranks 
WHERE LOWER(name) LIKE LOWER('%dundonald%');
"@

try {
    $rankResult = psql -c "$findRankQuery" -h localhost -U postgres -d mzansifleet -t -A
    if ($rankResult) {
        $rankId = $rankResult.Split('|')[0]
        $rankName = $rankResult.Split('|')[1]
        Write-Host "✅ Found Taxi Rank: $rankName (ID: $rankId)" -ForegroundColor Green
    } else {
        Write-Host "❌ Dundonald Taxi Rank not found in database" -ForegroundColor Red
        Write-Host "Available taxi ranks:" -ForegroundColor Yellow
        $allRanksQuery = "SELECT id, name FROM taxi_ranks ORDER BY name;"
        psql -c "$allRanksQuery" -h localhost -U postgres -d mzansifleet
        exit 1
    }
} catch {
    Write-Host "❌ Error connecting to database: $_" -ForegroundColor Red
    Write-Host "Please ensure PostgreSQL is running and connection details are correct" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check current queue entries for this taxi rank
Write-Host ""
Write-Host "Step 2: Analyzing current queue entries..." -ForegroundColor White

$queueEntriesQuery = @"
SELECT 
    dtq.id as queue_id,
    dtq.vehicle_id,
    v.registration as vehicle_reg,
    dtq.route_id,
    r.name as route_name,
    r.taxi_rank_id as route_taxi_rank_id,
    tr.name as route_taxi_rank_name,
    dtq.status,
    dtq.queue_date
FROM daily_taxi_queues dtq
LEFT JOIN vehicles v ON dtq.vehicle_id = v.id
LEFT JOIN routes r ON dtq.route_id = r.id
LEFT JOIN taxi_ranks tr ON r.taxi_rank_id = tr.id
WHERE dtq.taxi_rank_id = '$rankId'
ORDER BY dtq.queue_date DESC, r.name;
"@

Write-Host "Current queue entries for $TaxiRankName:" -ForegroundColor Yellow
psql -c "$queueEntriesQuery" -h localhost -U postgres -d mzansifleet

# Step 3: Identify problematic routes
Write-Host ""
Write-Host "Step 3: Identifying problematic routes..." -ForegroundColor White

$problematicRoutesQuery = @"
SELECT DISTINCT
    r.id as route_id,
    r.name as route_name,
    r.taxi_rank_id as route_taxi_rank_id,
    tr.name as route_taxi_rank_name,
    COUNT(dtq.id) as queue_entries
FROM routes r
LEFT JOIN taxi_ranks tr ON r.taxi_rank_id = tr.id
LEFT JOIN daily_taxi_queues dtq ON dtq.route_id = r.id AND dtq.taxi_rank_id = '$rankId'
WHERE dtq.id IS NOT NULL
GROUP BY r.id, r.name, r.taxi_rank_id, tr.name
ORDER BY queue_entries DESC;
"@

Write-Host "Routes with queue entries (showing actual taxi rank ownership):" -ForegroundColor Yellow
psql -c "$problematicRoutesQuery" -h localhost -U postgres -d mzansifleet

# Step 4: Check for orphaned or mismatched routes
Write-Host ""
Write-Host "Step 4: Checking for data integrity issues..." -ForegroundColor White

$integrityCheckQuery = @"
SELECT 
    'ORPHANED_ROUTE' as issue_type,
    dtq.id as queue_id,
    v.registration as vehicle_reg,
    dtq.route_id,
    'Route has no taxi_rank_id or route not found' as details
FROM daily_taxi_queues dtq
LEFT JOIN vehicles v ON dtq.vehicle_id = v.id
LEFT JOIN routes r ON dtq.route_id = r.id
WHERE dtq.taxi_rank_id = '$rankId' 
    AND (r.id IS NULL OR r.taxi_rank_id IS NULL)

UNION ALL

SELECT 
    'MISMATCHED_TAXI_RANK' as issue_type,
    dtq.id as queue_id,
    v.registration as vehicle_reg,
    dtq.route_id,
    CONCAT('Route belongs to ', tr.name, ' but queued for ', target_tr.name) as details
FROM daily_taxi_queues dtq
LEFT JOIN vehicles v ON dtq.vehicle_id = v.id
LEFT JOIN routes r ON dtq.route_id = r.id
LEFT JOIN taxi_ranks tr ON r.taxi_rank_id = tr.id
LEFT JOIN taxi_ranks target_tr ON dtq.taxi_rank_id = target_tr.id
WHERE dtq.taxi_rank_id = '$rankId' 
    AND r.id IS NOT NULL 
    AND r.taxi_rank_id IS NOT NULL 
    AND r.taxi_rank_id != dtq.taxi_rank_id;
"@

Write-Host "Data integrity issues found:" -ForegroundColor Red
$integrityIssues = psql -c "$integrityCheckQuery" -h localhost -U postgres -d mzansifleet -t -A

if ($integrityIssues) {
    Write-Host "❌ Found data integrity issues:" -ForegroundColor Red
    $integrityIssues | ForEach-Object {
        $parts = $_.Split('|')
        Write-Host "  - $($parts[0]): Queue ID $($parts[1]), Vehicle $($parts[2]), Route $($parts[3])" -ForegroundColor Gray
        Write-Host "    Details: $($parts[4])" -ForegroundColor DarkGray
    }
} else {
    Write-Host "✅ No data integrity issues found" -ForegroundColor Green
}

# Step 5: Generate fix suggestions
Write-Host ""
Write-Host "Step 5: Generating fix suggestions..." -ForegroundColor White

Write-Host "Recommended actions:" -ForegroundColor Yellow
Write-Host ""

if ($integrityIssues) {
    Write-Host "1. For ORPHANED_ROUTE issues:" -ForegroundColor White
    Write-Host "   - Update route to belong to correct taxi rank" -ForegroundColor Gray
    Write-Host "   - Or remove queue entries for invalid routes" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "2. For MISMATCHED_TAXI_RANK issues:" -ForegroundColor White
    Write-Host "   - Update queue entries to use correct taxi rank" -ForegroundColor Gray
    Write-Host "   - Or update route ownership to match queue entries" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "3. SQL fix examples (run with caution):" -ForegroundColor White
    Write-Host ""
    Write-Host "-- Fix orphaned routes by assigning to Dundonald Taxi Rank:" -ForegroundColor Gray
    Write-Host "UPDATE routes SET taxi_rank_id = '$rankId' WHERE id IN (SELECT route_id FROM daily_taxi_queues WHERE taxi_rank_id = '$rankId' AND route_id NOT IN (SELECT id FROM routes WHERE taxi_rank_id = '$rankId'));" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "-- Remove queue entries for invalid routes:" -ForegroundColor Gray
    Write-Host "DELETE FROM daily_taxi_queues WHERE taxi_rank_id = '$rankId' AND route_id NOT IN (SELECT id FROM routes);" -ForegroundColor DarkGray
    Write-Host ""
    
    Write-Host "⚠️  WARNING: Always backup your database before running fix queries!" -ForegroundColor Red
} else {
    Write-Host "✅ No fixes needed - data integrity looks good" -ForegroundColor Green
    Write-Host ""
    Write-Host "If you're still seeing wrong routes, the issue might be:" -ForegroundColor Yellow
    Write-Host "- Frontend caching issues" -ForegroundColor Gray
    Write-Host "- Wrong taxi rank being selected in the UI" -ForegroundColor Gray
    Write-Host "- Real-time updates showing stale data" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review the data integrity issues above" -ForegroundColor White
Write-Host "2. Apply fixes if needed (with database backup)" -ForegroundColor White
Write-Host "3. Restart the backend to clear any cached data" -ForegroundColor White
Write-Host "4. Test the queue management again" -ForegroundColor White
Write-Host ""
Write-Host "Diagnosis complete!" -ForegroundColor Green
