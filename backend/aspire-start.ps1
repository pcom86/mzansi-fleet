# Stop any running Aspire/DCP processes
Write-Host "Stopping existing Aspire processes..." -ForegroundColor Yellow
Get-Process dcp -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process dotnet, node -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*AppHost*" -or $_.CommandLine -like "*MzansiFleet*" -or $_.CommandLine -like "*expo*"
} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Starting Aspire AppHost (manages: Postgres + API + Mobile Frontend)..." -ForegroundColor Green
Write-Host "  Aspire Dashboard : http://localhost:15267" -ForegroundColor Cyan
Write-Host "  API              : http://localhost:5000" -ForegroundColor Cyan
Write-Host "  Scalar UI        : http://localhost:5000/scalar/v1" -ForegroundColor Cyan
Write-Host "  Expo Web         : http://localhost:8081" -ForegroundColor Cyan
Write-Host "  pgAdmin          : check Aspire Dashboard for port" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTE: API compiles in Debug mode on first run (~60s). Subsequent starts are faster." -ForegroundColor Yellow
Write-Host ""

dotnet run -c Release --project "$PSScriptRoot\MzansiFleet.AppHost\MzansiFleet.AppHost.csproj" --no-build --launch-profile http
