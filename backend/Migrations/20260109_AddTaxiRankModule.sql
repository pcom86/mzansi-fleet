-- Migration: Add Taxi Rank Module Tables
-- Date: 2026-01-09
-- Description: Creates tables for Taxi Rank operations including trips, passengers, costs, and marshal profiles

-- Create TaxiMarshalProfiles table
CREATE TABLE "TaxiMarshalProfiles" (
    "Id" UUID NOT NULL PRIMARY KEY,
    "UserId" UUID NOT NULL,
    "TenantId" UUID NOT NULL,
    "MarshalCode" VARCHAR(50) NOT NULL UNIQUE,
    "FullName" VARCHAR(200) NOT NULL,
    "PhoneNumber" VARCHAR(20) NOT NULL,
    "Email" VARCHAR(100),
    "TaxiRankLocation" VARCHAR(200),
    "HireDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "Status" VARCHAR(20) NOT NULL DEFAULT 'Active',
    "IdNumber" VARCHAR(50),
    "Address" TEXT,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP WITH TIME ZONE,
    CONSTRAINT "FK_TaxiMarshalProfiles_Users" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_TaxiMarshalProfiles_Tenants" FOREIGN KEY ("TenantId") REFERENCES "Tenants"("Id") ON DELETE CASCADE
);

-- Create TaxiRankTrips table
CREATE TABLE "TaxiRankTrips" (
    "Id" UUID NOT NULL PRIMARY KEY,
    "TenantId" UUID NOT NULL,
    "VehicleId" UUID NOT NULL,
    "DriverId" UUID NOT NULL,
    "MarshalId" UUID NOT NULL,
    "DepartureStation" VARCHAR(200) NOT NULL,
    "DestinationStation" VARCHAR(200) NOT NULL,
    "DepartureTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "ArrivalTime" TIMESTAMP WITH TIME ZONE,
    "TotalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "TotalCosts" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "NetAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "Status" VARCHAR(20) NOT NULL DEFAULT 'Departed',
    "PassengerCount" INTEGER NOT NULL DEFAULT 0,
    "Notes" TEXT,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP WITH TIME ZONE,
    CONSTRAINT "FK_TaxiRankTrips_Tenants" FOREIGN KEY ("TenantId") REFERENCES "Tenants"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_TaxiRankTrips_Vehicles" FOREIGN KEY ("VehicleId") REFERENCES "Vehicles"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_TaxiRankTrips_Drivers" FOREIGN KEY ("DriverId") REFERENCES "DriverProfiles"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_TaxiRankTrips_Marshals" FOREIGN KEY ("MarshalId") REFERENCES "Users"("Id") ON DELETE RESTRICT
);

-- Create TripPassengers table
CREATE TABLE "TripPassengers" (
    "Id" UUID NOT NULL PRIMARY KEY,
    "TaxiRankTripId" UUID NOT NULL,
    "PassengerName" VARCHAR(200),
    "PassengerPhone" VARCHAR(20),
    "DepartureStation" VARCHAR(200) NOT NULL,
    "ArrivalStation" VARCHAR(200) NOT NULL,
    "Amount" DECIMAL(18,2) NOT NULL,
    "SeatNumber" INTEGER,
    "BoardedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "Notes" TEXT,
    CONSTRAINT "FK_TripPassengers_TaxiRankTrips" FOREIGN KEY ("TaxiRankTripId") REFERENCES "TaxiRankTrips"("Id") ON DELETE CASCADE
);

-- Create TripCosts table
CREATE TABLE "TripCosts" (
    "Id" UUID NOT NULL PRIMARY KEY,
    "TaxiRankTripId" UUID NOT NULL,
    "AddedByDriverId" UUID NOT NULL,
    "Category" VARCHAR(100) NOT NULL,
    "Amount" DECIMAL(18,2) NOT NULL,
    "Description" TEXT NOT NULL,
    "ReceiptNumber" VARCHAR(100),
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_TripCosts_TaxiRankTrips" FOREIGN KEY ("TaxiRankTripId") REFERENCES "TaxiRankTrips"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_TripCosts_Drivers" FOREIGN KEY ("AddedByDriverId") REFERENCES "DriverProfiles"("Id") ON DELETE RESTRICT
);

-- Create indexes for better query performance
CREATE INDEX "IX_TaxiMarshalProfiles_UserId" ON "TaxiMarshalProfiles"("UserId");
CREATE INDEX "IX_TaxiMarshalProfiles_TenantId" ON "TaxiMarshalProfiles"("TenantId");
CREATE INDEX "IX_TaxiMarshalProfiles_MarshalCode" ON "TaxiMarshalProfiles"("MarshalCode");
CREATE INDEX "IX_TaxiMarshalProfiles_Status" ON "TaxiMarshalProfiles"("Status");

CREATE INDEX "IX_TaxiRankTrips_TenantId" ON "TaxiRankTrips"("TenantId");
CREATE INDEX "IX_TaxiRankTrips_VehicleId" ON "TaxiRankTrips"("VehicleId");
CREATE INDEX "IX_TaxiRankTrips_DriverId" ON "TaxiRankTrips"("DriverId");
CREATE INDEX "IX_TaxiRankTrips_MarshalId" ON "TaxiRankTrips"("MarshalId");
CREATE INDEX "IX_TaxiRankTrips_DepartureTime" ON "TaxiRankTrips"("DepartureTime");
CREATE INDEX "IX_TaxiRankTrips_Status" ON "TaxiRankTrips"("Status");

CREATE INDEX "IX_TripPassengers_TaxiRankTripId" ON "TripPassengers"("TaxiRankTripId");
CREATE INDEX "IX_TripPassengers_BoardedAt" ON "TripPassengers"("BoardedAt");

CREATE INDEX "IX_TripCosts_TaxiRankTripId" ON "TripCosts"("TaxiRankTripId");
CREATE INDEX "IX_TripCosts_AddedByDriverId" ON "TripCosts"("AddedByDriverId");
CREATE INDEX "IX_TripCosts_CreatedAt" ON "TripCosts"("CreatedAt");

-- Add comments to tables
COMMENT ON TABLE "TaxiMarshalProfiles" IS 'Stores profile information for taxi marshals';
COMMENT ON TABLE "TaxiRankTrips" IS 'Records all taxi rank trips captured by marshals';
COMMENT ON TABLE "TripPassengers" IS 'Stores passenger information for each trip';
COMMENT ON TABLE "TripCosts" IS 'Tracks expenses added by drivers for trips';

-- Add comments to key columns
COMMENT ON COLUMN "TaxiRankTrips"."TotalAmount" IS 'Total earnings from all passengers';
COMMENT ON COLUMN "TaxiRankTrips"."TotalCosts" IS 'Total costs added by driver';
COMMENT ON COLUMN "TaxiRankTrips"."NetAmount" IS 'Net profit (TotalAmount - TotalCosts)';
COMMENT ON COLUMN "TaxiRankTrips"."Status" IS 'Trip status: Departed, InTransit, Arrived, Completed';
