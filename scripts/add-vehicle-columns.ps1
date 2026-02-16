$connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres"

# SQL commands to add missing columns
$sqlCommands = @"
DO `$`$ 
BEGIN
    -- Add Mileage column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Vehicles' AND column_name='Mileage') THEN
        ALTER TABLE "Vehicles" ADD COLUMN "Mileage" integer NOT NULL DEFAULT 0;
    END IF;

    -- Add LastServiceDate column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Vehicles' AND column_name='LastServiceDate') THEN
        ALTER TABLE "Vehicles" ADD COLUMN "LastServiceDate" timestamp with time zone NULL;
    END IF;

    -- Add NextServiceDate column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Vehicles' AND column_name='NextServiceDate') THEN
        ALTER TABLE "Vehicles" ADD COLUMN "NextServiceDate" timestamp with time zone NULL;
    END IF;

    -- Add LastMaintenanceDate column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Vehicles' AND column_name='LastMaintenanceDate') THEN
        ALTER TABLE "Vehicles" ADD COLUMN "LastMaintenanceDate" timestamp with time zone NULL;
    END IF;

    -- Add NextMaintenanceDate column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Vehicles' AND column_name='NextMaintenanceDate') THEN
        ALTER TABLE "Vehicles" ADD COLUMN "NextMaintenanceDate" timestamp with time zone NULL;
    END IF;

    -- Add ServiceIntervalKm column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Vehicles' AND column_name='ServiceIntervalKm') THEN
        ALTER TABLE "Vehicles" ADD COLUMN "ServiceIntervalKm" integer NOT NULL DEFAULT 10000;
    END IF;

    -- Add PhotoBase64 column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Vehicles' AND column_name='PhotoBase64') THEN
        ALTER TABLE "Vehicles" ADD COLUMN "PhotoBase64" text NOT NULL DEFAULT '';
    END IF;
END `$`$;
"@

try {
    Add-Type -Path "C:\Program Files\dotnet\shared\Microsoft.NETCore.App\10.0.1\System.Data.Common.dll"
    $null = [Reflection.Assembly]::LoadWithPartialName("Npgsql")
    
    $connection = New-Object Npgsql.NpgsqlConnection($connectionString)
    $connection.Open()
    
    $command = $connection.CreateCommand()
    $command.CommandText = $sqlCommands
    $result = $command.ExecuteNonQuery()
    
    Write-Host "Successfully added missing columns to Vehicles table" -ForegroundColor Green
    
    $connection.Close()
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
