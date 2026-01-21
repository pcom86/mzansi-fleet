-- Make RouteId and DriverId nullable in Trips table to support rental trips
ALTER TABLE "Trips" ALTER COLUMN "RouteId" DROP NOT NULL;
ALTER TABLE "Trips" ALTER COLUMN "DriverId" DROP NOT NULL;
