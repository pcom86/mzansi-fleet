-- Migration: Add TaxiRank entity and update TaxiMarshalProfile and TaxiRankTrip relationships
-- Date: 2026-01-09
-- Description: Creates TaxiRanks table, adds TaxiRankId to TaxiMarshalProfiles and TaxiRankTrips

-- Step 1: Create TaxiRanks table
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

-- Step 2: Create indexes on TaxiRanks
CREATE INDEX IF NOT EXISTS "IX_TaxiRanks_TenantId" ON "TaxiRanks"("TenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_TaxiRanks_Code" ON "TaxiRanks"("Code");
CREATE INDEX IF NOT EXISTS "IX_TaxiRanks_Status" ON "TaxiRanks"("Status");
CREATE INDEX IF NOT EXISTS "IX_TaxiRanks_City" ON "TaxiRanks"("City");

-- Step 3: Add TaxiRankId column to TaxiMarshalProfiles (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='TaxiMarshalProfiles' AND column_name='TaxiRankId') THEN
        ALTER TABLE "TaxiMarshalProfiles" 
        ADD COLUMN "TaxiRankId" uuid NULL;
        
        -- Add foreign key constraint
        ALTER TABLE "TaxiMarshalProfiles"
        ADD CONSTRAINT "FK_TaxiMarshalProfiles_TaxiRanks" 
        FOREIGN KEY ("TaxiRankId") REFERENCES "TaxiRanks"("Id") ON DELETE RESTRICT;
        
        -- Create index
        CREATE INDEX "IX_TaxiMarshalProfiles_TaxiRankId" ON "TaxiMarshalProfiles"("TaxiRankId");
    END IF;
END $$;

-- Step 4: Remove TaxiRankLocation column from TaxiMarshalProfiles (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='TaxiMarshalProfiles' AND column_name='TaxiRankLocation') THEN
        ALTER TABLE "TaxiMarshalProfiles" 
        DROP COLUMN "TaxiRankLocation";
    END IF;
END $$;

-- Step 5: Add TaxiRankId column to TaxiRankTrips (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='TaxiRankTrips' AND column_name='TaxiRankId') THEN
        ALTER TABLE "TaxiRankTrips" 
        ADD COLUMN "TaxiRankId" uuid NULL;
        
        -- Add foreign key constraint
        ALTER TABLE "TaxiRankTrips"
        ADD CONSTRAINT "FK_TaxiRankTrips_TaxiRanks" 
        FOREIGN KEY ("TaxiRankId") REFERENCES "TaxiRanks"("Id") ON DELETE RESTRICT;
        
        -- Create index
        CREATE INDEX "IX_TaxiRankTrips_TaxiRankId" ON "TaxiRankTrips"("TaxiRankId");
    END IF;
END $$;

-- Step 6: Update Tenant table to add Code column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='Tenants' AND column_name='Code') THEN
        ALTER TABLE "Tenants" 
        ADD COLUMN "Code" varchar(50) NULL;
        
        -- Create unique index
        CREATE UNIQUE INDEX "IX_Tenants_Code" ON "Tenants"("Code") WHERE "Code" IS NOT NULL;
    END IF;
END $$;

-- Step 7: Optional - Create a default taxi rank for testing (comment out in production)
-- INSERT INTO "TaxiRanks" ("Id", "TenantId", "Name", "Code", "Address", "City", "Province", "Status", "CreatedAt")
-- SELECT 
--     gen_random_uuid(),
--     t."Id",
--     'Main Taxi Rank',
--     'MAIN-RANK',
--     '123 Main Street',
--     'Johannesburg',
--     'Gauteng',
--     'Active',
--     NOW()
-- FROM "Tenants" t
-- LIMIT 1
-- ON CONFLICT DO NOTHING;

COMMIT;
