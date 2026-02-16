# Direct database migration script
Add-Type -Path "C:\Users\pmaseko\mzansi fleet\backend\MzansiFleet.Api\bin\Debug\net9.0\Npgsql.dll"

$connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres"

try {
    $connection = New-Object Npgsql.NpgsqlConnection($connectionString)
    $connection.Open()

    $command = $connection.CreateCommand()
    $command.CommandText = @"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'TripPassengers'
        AND column_name = 'UserId'
    ) THEN
        ALTER TABLE ""TripPassengers""
        ADD COLUMN ""UserId"" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

        RAISE NOTICE 'UserId column added to TripPassengers';
    ELSE
        RAISE NOTICE 'UserId column already exists in TripPassengers';
    END IF;
END $$;
"@

    $command.ExecuteNonQuery() | Out-Null
    Write-Host "Migration executed successfully!" -ForegroundColor Green

    $connection.Close()
}
catch {
    Write-Host "Error executing migration: $_" -ForegroundColor Red
    exit 1
}