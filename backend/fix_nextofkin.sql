-- Add NextOfKin columns to TripPassengers table
ALTER TABLE "TripPassengers" ADD COLUMN IF NOT EXISTS "NextOfKinName" text;
ALTER TABLE "TripPassengers" ADD COLUMN IF NOT EXISTS "NextOfKinContact" text;

-- Mark migration as applied
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260316193000_AddNextOfKinToTripPassenger', '9.0.0')
ON CONFLICT ("MigrationId") DO NOTHING;
