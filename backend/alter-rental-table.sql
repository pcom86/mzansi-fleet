-- Add missing columns to VehicleRentalRequests table
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "BudgetMin" numeric(18,2);
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "BudgetMax" numeric(18,2);
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "SeatingCapacity" integer;
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "DurationDays" integer;
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "TripPurpose" text;
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "SpecialRequirements" text;
ALTER TABLE "VehicleRentalRequests" ADD COLUMN IF NOT EXISTS "ClosedAt" timestamp without time zone;

-- Remove old columns if they exist
ALTER TABLE "VehicleRentalRequests" DROP COLUMN IF EXISTS "MinCapacity";
ALTER TABLE "VehicleRentalRequests" DROP COLUMN IF EXISTS "Budget";
ALTER TABLE "VehicleRentalRequests" DROP COLUMN IF EXISTS "AdditionalRequirements";
ALTER TABLE "VehicleRentalRequests" DROP COLUMN IF EXISTS "UpdatedAt";
