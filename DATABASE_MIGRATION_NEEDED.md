# Database Migration Required

The system is missing the `Code` column in the `Tenants` table and the `TaxiRanks` table doesn't exist.

## Quick Fix - Run this SQL in your PostgreSQL database:

```sql
-- Add Code column to Tenants table
ALTER TABLE "Tenants" ADD COLUMN IF NOT EXISTS "Code" varchar(50) NULL;
ALTER TABLE "Tenants" ADD COLUMN IF NOT EXISTS "ContactEmail" varchar(255) NULL;
ALTER TABLE "Tenants" ADD COLUMN IF NOT EXISTS "ContactPhone" varchar(50) NULL;

-- Create unique index on Code
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Tenants_Code" ON "Tenants"("Code") WHERE "Code" IS NOT NULL;

-- Create TaxiRanks table
CREATE TABLE IF NOT EXISTS "TaxiRanks" (
    "Id" uuid PRIMARY KEY,
    "TenantId" uuid NOT NULL,
    "Name" varchar(200) NOT NULL,
    "Code" varchar(50) NOT NULL,
    "Address" varchar(500) NOT NULL,
    "City" varchar(100) NOT NULL,
    "Province" varchar(100) NOT NULL,
    "Latitude" decimal(10, 7) NULL,
    "Longitude" decimal(10, 7) NULL,
    "Capacity" integer NULL,
    "OperatingHours" varchar(100) NULL,
    "Status" varchar(50) NOT NULL DEFAULT 'Active',
    "Notes" text NULL,
    "CreatedAt" timestamp NOT NULL DEFAULT NOW(),
    "UpdatedAt" timestamp NULL,
    CONSTRAINT "FK_TaxiRanks_Tenants" FOREIGN KEY ("TenantId") REFERENCES "Tenants"("Id") ON DELETE CASCADE
);

-- Create indexes on TaxiRanks
CREATE INDEX IF NOT EXISTS "IX_TaxiRanks_TenantId" ON "TaxiRanks"("TenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_TaxiRanks_Code" ON "TaxiRanks"("Code");
CREATE INDEX IF NOT EXISTS "IX_TaxiRanks_Status" ON "TaxiRanks"("Status");
CREATE INDEX IF NOT EXISTS "IX_TaxiRanks_City" ON "TaxiRanks"("City");
```

## How to run:

### Option 1: Using psql command line
```bash
psql -h localhost -U postgres -d mzansi_fleet -c "ALTER TABLE \"Tenants\" ADD COLUMN IF NOT EXISTS \"Code\" varchar(50) NULL;"
psql -h localhost -U postgres -d mzansi_fleet -c "ALTER TABLE \"Tenants\" ADD COLUMN IF NOT EXISTS \"ContactEmail\" varchar(255) NULL;"
psql -h localhost -U postgres -d mzansi_fleet -c "ALTER TABLE \"Tenants\" ADD COLUMN IF NOT EXISTS \"ContactPhone\" varchar(50) NULL;"
```

### Option 2: Using pgAdmin or any PostgreSQL client
1. Connect to the `mzansi_fleet` database
2. Open a SQL query window
3. Paste the above SQL
4. Execute

### Option 3: Run the full migration file
```bash
psql -h localhost -U postgres -d mzansi_fleet -f "c:\Users\pmaseko\mzansi fleet\backend\Migrations\20260109_AddTaxiRankEntity.sql"
```

After running the migration, restart the API and try creating a taxi association again.
