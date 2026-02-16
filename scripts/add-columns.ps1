Write-Host "Fixing VehicleRentalRequests table columns..." -ForegroundColor Cyan

$sql = @"
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "BudgetMin" numeric(18,2);
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "BudgetMax" numeric(18,2);
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "SeatingCapacity" integer;
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "DurationDays" integer;
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "TripPurpose" text;
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "SpecialRequirements" text;
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "ClosedAt" timestamp without time zone;
"@

# Load Npgsql DLL
$npgsqlPath = Get-ChildItem -Path "$env:USERPROFILE\.nuget\packages\npgsql\8.0.1\lib\net8.0\Npgsql.dll" -ErrorAction SilentlyContinue
if ($npgsqlPath) {
    Add-Type -Path $npgsqlPath.FullName
    Write-Host "Loaded Npgsql from NuGet cache" -ForegroundColor Yellow
    
    $connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres"
    $connection = New-Object Npgsql.NpgsqlConnection($connectionString)
    $connection.Open()
    Write-Host "Connected to MzansiFleetDb" -ForegroundColor Green
    
    $command = $connection.CreateCommand()
    $command.CommandText = $sql
    $result = $command.ExecuteNonQuery()
    
    Write-Host "✓ Columns added successfully! ($result rows affected)" -ForegroundColor Green
    $connection.Close()
} else {
    Write-Host "Npgsql not found. Please ensure the NuGet package is installed." -ForegroundColor Red
    exit 1
}
