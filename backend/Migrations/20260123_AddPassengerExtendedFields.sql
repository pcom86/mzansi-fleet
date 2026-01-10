-- Migration: Add extended fields to Passengers table
-- Date: 2026-01-23

ALTER TABLE "Passengers" 
ADD COLUMN "NextOfKin" TEXT NULL,
ADD COLUMN "NextOfKinContact" TEXT NULL,
ADD COLUMN "Address" TEXT NULL,
ADD COLUMN "Destination" TEXT NULL;

-- Update migration metadata
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260123_AddPassengerExtendedFields', '8.0.0');
