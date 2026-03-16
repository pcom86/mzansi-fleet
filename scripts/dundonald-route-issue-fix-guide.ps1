# Dundonald Taxi Rank Route Issue - Diagnosis & Fix Guide
# Resolving incorrect routes loading in Queue Management

Write-Host "Dundonald Taxi Rank Route Issue" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

Write-Host "🔍 Issue Description:" -ForegroundColor Yellow
Write-Host "Dundonald Taxi Rank is loading routes that are not linked to it in the Queue Management system." -ForegroundColor White
Write-Host ""

Write-Host "🎯 Root Causes:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Data Integrity Issues" -ForegroundColor White
Write-Host "   - Queue entries with invalid RouteId" -ForegroundColor Gray
Write-Host "   - Routes belonging to different taxi ranks" -ForegroundColor Gray
Write-Host "   - Orphaned routes without taxi rank assignment" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Backend Filtering" -ForegroundColor White
Write-Host "   - Insufficient validation in API queries" -ForegroundColor Gray
Write-Host "   - Missing null checks for relationships" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Frontend Display" -ForegroundColor White
Write-Host "   - Displaying all route queues without proper filtering" -ForegroundColor Gray
Write-Host "   - Caching issues showing stale data" -ForegroundColor Gray
Write-Host ""

Write-Host "🔧 Fixes Applied:" -ForegroundColor Green
Write-Host ""

Write-Host "1. Backend API Improvements" -ForegroundColor White
Write-Host "✅ Added stricter filtering in QueueManagementController" -ForegroundColor Gray
Write-Host "✅ Added null checks for Route and Vehicle relationships" -ForegroundColor Gray
Write-Host "✅ Added comprehensive logging for debugging" -ForegroundColor Gray
Write-Host "✅ Created DebugController for route analysis" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Enhanced Filtering Logic" -ForegroundColor White
Write-Host "   Before: .Where(q => q.TaxiRankId == rankId && q.QueueDate == targetDate)" -ForegroundColor Gray
Write-Host "   After:  .Where(q => q.TaxiRankId == rankId && q.QueueDate == targetDate && q.RouteId.HasValue)" -ForegroundColor Gray
Write-Host "           .Where(q => q.Route != null && q.Vehicle != null)" -ForegroundColor Gray
Write-Host ""

Write-Host "3. Debug Tools Created" -ForegroundColor White
Write-Host "✅ PowerShell script for database diagnosis" -ForegroundColor Gray
Write-Host "✅ Debug API endpoints for route analysis" -ForegroundColor Gray
Write-Host "✅ Comprehensive logging for troubleshooting" -ForegroundColor Gray
Write-Host ""

Write-Host "📊 How to Diagnose:" -ForegroundColor Yellow
Write-Host ""

Write-Host "Method 1: Use PowerShell Diagnosis Script" -ForegroundColor White
Write-Host "1. Run: .\scripts\diagnose-dundonald-routes.ps1" -ForegroundColor Gray
Write-Host "2. Review the data integrity issues found" -ForegroundColor Gray
Write-Host "3. Apply the suggested SQL fixes (with backup!)" -ForegroundColor Gray
Write-Host ""

Write-Host "Method 2: Use Debug API Endpoints" -ForegroundColor White
Write-Host "1. GET /api/debug/taxi-rank-routes/{taxiRankId}" -ForegroundColor Gray
Write-Host "2. GET /api/debug/all-routes" -ForegroundColor Gray
Write-Host "3. Review the JSON response for issues" -ForegroundColor Gray
Write-Host ""

Write-Host "Method 3: Check Backend Logs" -ForegroundColor White
Write-Host "1. Start the backend with logging enabled" -ForegroundColor Gray
Write-Host "2. Access Dundonald Taxi Rank queue management" -ForegroundColor Gray
Write-Host "3. Review logs for queue entry details" -ForegroundColor Gray
Write-Host ""

Write-Host "🛠️ Common Fixes:" -ForegroundColor Yellow
Write-Host ""

Write-Host "Fix 1: Update Route Ownership" -ForegroundColor White
Write-Host "-- Assign orphaned routes to correct taxi rank" -ForegroundColor Gray
Write-Host "UPDATE routes SET taxi_rank_id = 'dundonald_rank_id' WHERE id IN (SELECT route_id FROM daily_taxi_queues WHERE taxi_rank_id = 'dundonald_rank_id' AND route_id NOT IN (SELECT id FROM routes WHERE taxi_rank_id = 'dundonald_rank_id'));" -ForegroundColor DarkGray
Write-Host ""

Write-Host "Fix 2: Remove Invalid Queue Entries" -ForegroundColor White
Write-Host "-- Clean up queue entries for non-existent routes" -ForegroundColor Gray
Write-Host "DELETE FROM daily_taxi_queues WHERE route_id NOT IN (SELECT id FROM routes);" -ForegroundColor DarkGray
Write-Host ""

Write-Host "Fix 3: Update Queue Entries" -ForegroundColor White
Write-Host "-- Move queue entries to correct taxi rank" -ForegroundColor Gray
Write-Host "UPDATE daily_taxi_queues SET taxi_rank_id = (SELECT taxi_rank_id FROM routes WHERE id = route_id) WHERE route_id IN (SELECT id FROM routes WHERE taxi_rank_id != 'dundonald_rank_id');" -ForegroundColor DarkGray
Write-Host ""

Write-Host "⚠️  Important Notes:" -ForegroundColor Red
Write-Host ""
Write-Host "• ALWAYS backup your database before running fix queries" -ForegroundColor White
Write-Host "• Test fixes in development environment first" -ForegroundColor White
Write-Host "• Restart backend after database changes to clear cache" -ForegroundColor White
Write-Host "• Clear browser cache to refresh frontend data" -ForegroundColor White
Write-Host ""

Write-Host "🚀 Testing the Fix:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Apply database fixes (if needed)" -ForegroundColor White
Write-Host "2. Restart the backend server" -ForegroundColor White
Write-Host "3. Clear browser cache" -ForegroundColor White
Write-Host "4. Access Dundonald Taxi Rank queue management" -ForegroundColor White
Write-Host "5. Verify only correct routes are displayed" -ForegroundColor White
Write-Host "6. Check backend logs for proper filtering" -ForegroundColor White
Write-Host ""

Write-Host "📞 If Issues Persist:" -ForegroundColor Yellow
Write-Host ""
Write-Host "• Check if correct taxi rank is being selected in UI" -ForegroundColor White
Write-Host "• Verify user permissions and taxi rank assignments" -ForegroundColor White
Write-Host "• Check for frontend caching issues" -ForegroundColor White
Write-Host "• Review SignalR real-time update logic" -ForegroundColor White
Write-Host "• Test with different taxi ranks to isolate the issue" -ForegroundColor White
Write-Host ""

Write-Host "✅ Expected Result:" -ForegroundColor Green
Write-Host ""
Write-Host "• Dundonald Taxi Rank shows only routes linked to it" -ForegroundColor White
Write-Host "• No orphaned or mismatched routes displayed" -ForegroundColor White
Write-Host "• Proper filtering in backend API" -ForegroundColor White
Write-Host "• Accurate queue data for correct taxi rank" -ForegroundColor White
Write-Host ""

Write-Host "🎯 Success Indicators:" -ForegroundColor Green
Write-Host "• Backend logs show correct taxi rank filtering" -ForegroundColor White
Write-Host "• Debug API returns no integrity issues" -ForegroundColor White
Write-Host "• Frontend displays only expected routes" -ForegroundColor White
Write-Host "• Queue management works correctly" -ForegroundColor White
