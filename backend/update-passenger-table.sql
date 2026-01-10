-- Add missing columns to Passengers table
ALTER TABLE "Passengers" ADD COLUMN IF NOT EXISTS "NextOfKin" TEXT NULL;
ALTER TABLE "Passengers" ADD COLUMN IF NOT EXISTS "NextOfKinContact" TEXT NULL;
ALTER TABLE "Passengers" ADD COLUMN IF NOT EXISTS "Address" TEXT NULL;
ALTER TABLE "Passengers" ADD COLUMN IF NOT EXISTS "Destination" TEXT NULL;
