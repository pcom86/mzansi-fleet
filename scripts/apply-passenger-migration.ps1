# Migration script for AddPassengerExtendedFields
# Run this from PowerShell with: .\apply-passenger-migration.ps1

$connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgresspass"

try {
    Add-Type -Path "C:\Users\pmaseko\.nuget\packages\npgsql\10.0.0\lib\net8.0\Npgsql.dll"
    
    $connection = New-Object Npgsql.NpgsqlConnection($connectionString)
    $connection.Open()
    
    Write-Host "Connected to database successfully"
    
    # Add new columns to Passengers table
    $sql = @"
ALTER TABLE "Passengers" 
ADD COLUMN IF NOT EXISTS "NextOfKin" TEXT NULL,
ADD COLUMN IF NOT EXISTS "NextOfKinContact" TEXT NULL,
ADD COLUMN IF NOT EXISTS "Address" TEXT NULL,
ADD COLUMN IF NOT EXISTS "Destination" TEXT NULL;
"@
    
    $command = $connection.CreateCommand()
    $command.CommandText = $sql
    $command.ExecuteNonQuery()
    
    Write-Host "Migration completed successfully!"
    Write-Host "Added columns: NextOfKin, NextOfKinContact, Address, Destination"
    
    $connection.Close()
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
