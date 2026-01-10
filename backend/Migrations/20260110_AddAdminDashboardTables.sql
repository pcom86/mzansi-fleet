-- Migration: Add Admin Dashboard Tables
-- Date: 2026-01-10
-- Description: Create tables for Taxi Rank Admin Dashboard features

-- Routes table
CREATE TABLE IF NOT EXISTS "Routes" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Code" VARCHAR(50) NOT NULL UNIQUE,
    "Name" VARCHAR(200) NOT NULL,
    "Origin" VARCHAR(200) NOT NULL,
    "Destination" VARCHAR(200) NOT NULL,
    "Stops" TEXT[], -- PostgreSQL array of strings
    "Distance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "EstimatedDuration" INTEGER NOT NULL DEFAULT 0, -- in minutes
    "FareAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "Status" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP NULL
);

-- OwnerAssignments table
CREATE TABLE IF NOT EXISTS "OwnerAssignments" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "OwnerId" UUID NOT NULL REFERENCES "OwnerProfiles"("Id") ON DELETE CASCADE,
    "TaxiRankId" UUID NOT NULL REFERENCES "TaxiRanks"("Id") ON DELETE CASCADE,
    "AssignedDate" TIMESTAMP NOT NULL DEFAULT NOW(),
    "Status" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- VehicleRouteAssignments table
CREATE TABLE IF NOT EXISTS "VehicleRouteAssignments" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "VehicleId" UUID NOT NULL REFERENCES "Vehicles"("Id") ON DELETE CASCADE,
    "RouteId" UUID NOT NULL REFERENCES "Routes"("Id") ON DELETE CASCADE,
    "AssignedDate" TIMESTAMP NOT NULL DEFAULT NOW(),
    "Status" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Trips table (for trip details with passenger lists)
CREATE TABLE IF NOT EXISTS "Trips" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "VehicleId" UUID NOT NULL REFERENCES "Vehicles"("Id") ON DELETE CASCADE,
    "RouteId" UUID NOT NULL REFERENCES "Routes"("Id") ON DELETE CASCADE,
    "DriverId" UUID NOT NULL REFERENCES "DriverProfiles"("Id") ON DELETE CASCADE,
    "TripDate" TIMESTAMP NOT NULL,
    "DepartureTime" VARCHAR(50) NOT NULL,
    "ArrivalTime" VARCHAR(50) NULL,
    "PassengerCount" INTEGER NOT NULL DEFAULT 0,
    "TotalFare" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "Notes" TEXT NULL,
    "Status" VARCHAR(50) NOT NULL DEFAULT 'Completed',
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Passengers table
CREATE TABLE IF NOT EXISTS "Passengers" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "TripId" UUID NOT NULL REFERENCES "Trips"("Id") ON DELETE CASCADE,
    "Name" VARCHAR(200) NOT NULL,
    "ContactNumber" VARCHAR(20) NULL,
    "FareAmount" DECIMAL(18,2) NOT NULL DEFAULT 0
);

-- VehicleEarnings table
CREATE TABLE IF NOT EXISTS "VehicleEarnings" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "VehicleId" UUID NOT NULL REFERENCES "Vehicles"("Id") ON DELETE CASCADE,
    "TripId" UUID NULL REFERENCES "Trips"("Id") ON DELETE SET NULL,
    "Amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "Date" TIMESTAMP NOT NULL,
    "Description" VARCHAR(500) NOT NULL,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "IX_Routes_Code" ON "Routes"("Code");
CREATE INDEX IF NOT EXISTS "IX_Routes_Status" ON "Routes"("Status");
CREATE INDEX IF NOT EXISTS "IX_OwnerAssignments_OwnerId" ON "OwnerAssignments"("OwnerId");
CREATE INDEX IF NOT EXISTS "IX_OwnerAssignments_TaxiRankId" ON "OwnerAssignments"("TaxiRankId");
CREATE INDEX IF NOT EXISTS "IX_VehicleRouteAssignments_VehicleId" ON "VehicleRouteAssignments"("VehicleId");
CREATE INDEX IF NOT EXISTS "IX_VehicleRouteAssignments_RouteId" ON "VehicleRouteAssignments"("RouteId");
CREATE INDEX IF NOT EXISTS "IX_Trips_VehicleId" ON "Trips"("VehicleId");
CREATE INDEX IF NOT EXISTS "IX_Trips_RouteId" ON "Trips"("RouteId");
CREATE INDEX IF NOT EXISTS "IX_Trips_DriverId" ON "Trips"("DriverId");
CREATE INDEX IF NOT EXISTS "IX_Passengers_TripId" ON "Passengers"("TripId");
CREATE INDEX IF NOT EXISTS "IX_VehicleEarnings_VehicleId" ON "VehicleEarnings"("VehicleId");
CREATE INDEX IF NOT EXISTS "IX_VehicleEarnings_TripId" ON "VehicleEarnings"("TripId");
