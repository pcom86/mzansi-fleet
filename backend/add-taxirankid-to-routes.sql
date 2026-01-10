-- Add TaxiRankId column to Routes table
ALTER TABLE "Routes" 
ADD COLUMN IF NOT EXISTS "TaxiRankId" UUID;

-- Add foreign key constraint
ALTER TABLE "Routes"
ADD CONSTRAINT "FK_Routes_TaxiRanks_TaxiRankId" 
FOREIGN KEY ("TaxiRankId") 
REFERENCES "TaxiRanks"("Id") 
ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS "IX_Routes_TaxiRankId" 
ON "Routes" ("TaxiRankId");

-- Show current Routes to verify
SELECT "Id", "Name", "TenantId", "TaxiRankId" FROM "Routes";
