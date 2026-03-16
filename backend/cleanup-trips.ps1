# Simple script to clean up extra trips for March 13
try {
    $conn = New-Object System.Data.SqlClient.SqlConnection
    # This won't work for PostgreSQL, but let's try a different approach
    
    # Use the API to delete trips (if there's a delete endpoint)
    # For now, let's just report the issue
    
    Write-Output "To fix March 13 trips:"
    Write-Output "1. Stop the API process (taskkill /F /IM MzansiFleet.Api.exe)"
    Write-Output "2. Run: dotnet run"
    Write-Output "3. The cleanup SQL in Program.cs will run on startup"
    Write-Output ""
    Write-Output "Or manually delete with SQL:"
    Write-Output "DELETE FROM ""ScheduledTrips"" WHERE ""ScheduledDate"" = '2026-03-13' AND ""ScheduledTime"" IN ('07:30:00', '10:00:00', '12:00:00', '14:00:00');"
} catch {
    Write-Output "Error: $($_.Exception.Message)"
}
