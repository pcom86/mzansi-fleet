# Script to apply tracking device tables migration to PostgreSQL database

param(
    [string]$Server = "localhost",
    [string]$Port = "5432",
    [string]$Database = "mzansi_fleet_db",
    [string]$Username = "postgres",
    [string]$Password = "postgres"
)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Tracking Device Tables Migration" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$env:PGPASSWORD = $Password
$sqlFile = Join-Path $PSScriptRoot "add-tracking-device-tables.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "Error: Migration file not found at $sqlFile" -ForegroundColor Red
    exit 1
}

# Try to find psql in common PostgreSQL installation paths
$psqlPaths = @(
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files\PostgreSQL\14\bin\psql.exe",
    "C:\PostgreSQL\bin\psql.exe"
)

$psqlExe = $null
foreach ($path in $psqlPaths) {
    if (Test-Path $path) {
        $psqlExe = $path
        Write-Host "Found PostgreSQL at: $psqlExe" -ForegroundColor Green
        break
    }
}

if (-not $psqlExe) {
    Write-Host "Error: PostgreSQL psql command not found!" -ForegroundColor Red
    Write-Host "Please install PostgreSQL or add psql.exe to your PATH" -ForegroundColor Yellow
    Write-Host "Typical location: C:\Program Files\PostgreSQL\[version]\bin\psql.exe" -ForegroundColor Yellow
    exit 1
}
& $psqlExe
Write-Host "Connecting to PostgreSQL..." -ForegroundColor Yellow
Write-Host "Server: $Server" -ForegroundColor Gray
Write-Host "Port: $Port" -ForegroundColor Gray
Write-Host "Database: $Database" -ForegroundColor Gray
Write-Host ""

try {
    Write-Host "Executing migration..." -ForegroundColor Yellow
    
    $result = & $psqlExe -h $Server -p $Port -d $Database -U $Username -f $sqlFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Created tables:" -ForegroundColor Cyan
        Write-Host "  - TrackingDeviceRequests" -ForegroundColor White
        Write-Host "  - TrackingDeviceOffers" -ForegroundColor White
        Write-Host ""
        
        # Verify tables were created
        Write-Host "Verifying tables..." -ForegroundColor Yellow
        $verifyQuery = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('TrackingDeviceRequests', 'TrackingDeviceOffers');"
        
        $tables = psql -h $Server -p $Port -d $Database -U $Username -t -A -c $verifyQuery 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Verified tables in database:" -ForegroundColor Green
            $tableList = $tables -split [Environment]::NewLine
            foreach ($table in $tableList) {
                if ($table -match '\S') {
                    Write-Host "  - $table" -ForegroundColor Green
                }
            }
            Write-Host ""
        } else {
            Write-Host "Warning: Could not verify tables" -ForegroundColor Yellow
        }
    } else {
        Write-Host ""
        Write-Host "Migration failed!" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "Error executing migration!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Migration process completed!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
