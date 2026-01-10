$env:PGPASSWORD = "postgres"
$sqlFile = "add-taxirankid-to-routes.sql"

Write-Host "Applying TaxiRankId migration to Routes table..." -ForegroundColor Cyan

# Try to find psql in common PostgreSQL installation paths
$psqlPaths = @(
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files\PostgreSQL\14\bin\psql.exe",
    "C:\PostgreSQL\bin\psql.exe"
)

$psqlExe = $null
foreach ($path in $psqlPaths) {
    if (Test-Path $path) {
        $psqlExe = $path
        break
    }
}

if ($psqlExe) {
    Write-Host "Found psql at: $psqlExe" -ForegroundColor Green
    & $psqlExe -h localhost -U postgres -d MzansiFleetDb -f $sqlFile
} else {
    Write-Host "psql not found in common locations. Using alternative method..." -ForegroundColor Yellow
    
    # Alternative: Use .NET to execute the SQL
    dotnet run --project UpdateRouteTaxiRankIdSchema
}

Write-Host "`nMigration completed!" -ForegroundColor Green
