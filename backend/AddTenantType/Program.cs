using Npgsql;
using System;

var connectionString = "Host=localhost;Database=MzansiFleetDb;Username=postgres;Password=postgres";

Console.WriteLine("Applying AddTenantType migration...");

using var connection = new NpgsqlConnection(connectionString);
connection.Open();

using var cmd = connection.CreateCommand();

// Add TenantType column to Tenants table with default value
cmd.CommandText = @"
    DO $$ 
    BEGIN
        -- Add TenantType column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'Tenants' 
            AND column_name = 'TenantType'
        ) THEN
            ALTER TABLE ""Tenants"" 
            ADD COLUMN ""TenantType"" VARCHAR(100) NOT NULL DEFAULT 'Taxi Association';
            
            RAISE NOTICE 'Added TenantType column to Tenants table';
        ELSE
            RAISE NOTICE 'TenantType column already exists';
        END IF;
    END $$;
";

cmd.ExecuteNonQuery();
Console.WriteLine("Migration completed successfully!");
