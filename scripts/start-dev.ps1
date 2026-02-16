# Start Mzansi Fleet Development Servers
# This script starts both the backend (.NET API) and frontend (Angular) servers

Write-Host "Starting Mzansi Fleet Development Servers..." -ForegroundColor Cyan
Write-Host ""

# Get the script directory (project root)
$projectRoot = $PSScriptRoot

# Define paths
$backendPath = Join-Path $projectRoot "backend\MzansiFleet.Api"
$frontendPath = Join-Path $projectRoot "frontend"

# Check if backend path exists
if (-Not (Test-Path $backendPath)) {
    Write-Host "ERROR: Backend path not found: $backendPath" -ForegroundColor Red
    exit 1
}

# Check if frontend path exists
if (-Not (Test-Path $frontendPath)) {
    Write-Host "ERROR: Frontend path not found: $frontendPath" -ForegroundColor Red
    exit 1
}

# Start Backend API
Write-Host "Starting Backend API (.NET)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$backendPath'; Write-Host 'Backend API Server' -ForegroundColor Green; Write-Host 'Location: $backendPath' -ForegroundColor Cyan; Write-Host ''; dotnet run"
) -WindowStyle Normal

Start-Sleep -Seconds 2

# Start Frontend
Write-Host "Starting Frontend (Angular)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$frontendPath'; Write-Host 'Frontend Development Server' -ForegroundColor Green; Write-Host 'Location: $frontendPath' -ForegroundColor Cyan; Write-Host ''; npm start"
) -WindowStyle Normal

Write-Host ""
Write-Host "Development servers are starting..." -ForegroundColor Green
Write-Host ""
Write-Host "Server Information:" -ForegroundColor Cyan
Write-Host "   Backend API:  http://localhost:5000 (or check backend terminal)" -ForegroundColor White
Write-Host "   Frontend:     http://localhost:4200" -ForegroundColor White
Write-Host ""
Write-Host "Tip: Two new terminal windows will open for backend and frontend." -ForegroundColor Gray
Write-Host "To stop the servers, close the terminal windows or press Ctrl+C in each." -ForegroundColor Gray
Write-Host ""
