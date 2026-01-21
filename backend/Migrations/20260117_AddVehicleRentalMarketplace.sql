-- Migration: Add Vehicle Rental Marketplace Tables
-- Date: 2026-01-17
-- Description: Create tables for vehicle rental requests, offers, and bookings

-- Create VehicleRentalRequests table
CREATE TABLE IF NOT EXISTS "VehicleRentalRequests" (
    "Id" UUID PRIMARY KEY,
    "UserId" UUID NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE,
    "TenantId" UUID NOT NULL REFERENCES "Tenants"("Id"),
    "VehicleType" VARCHAR(100) NOT NULL,
    "SeatingCapacity" INTEGER,
    "PickupLocation" TEXT NOT NULL,
    "DropoffLocation" TEXT NOT NULL,
    "StartDate" TIMESTAMP NOT NULL,
    "EndDate" TIMESTAMP NOT NULL,
    "DurationDays" INTEGER NOT NULL,
    "TripPurpose" VARCHAR(200) NOT NULL,
    "SpecialRequirements" TEXT,
    "BudgetMin" DECIMAL(18,2),
    "BudgetMax" DECIMAL(18,2),
    "Status" VARCHAR(50) NOT NULL DEFAULT 'Open',
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ClosedAt" TIMESTAMP,
    "AcceptedOfferId" UUID
);

CREATE INDEX IF NOT EXISTS "IX_VehicleRentalRequests_UserId" ON "VehicleRentalRequests"("UserId");
CREATE INDEX IF NOT EXISTS "IX_VehicleRentalRequests_Status" ON "VehicleRentalRequests"("Status");
CREATE INDEX IF NOT EXISTS "IX_VehicleRentalRequests_StartDate" ON "VehicleRentalRequests"("StartDate");

-- Create RentalOffers table
CREATE TABLE IF NOT EXISTS "RentalOffers" (
    "Id" UUID PRIMARY KEY,
    "RentalRequestId" UUID NOT NULL REFERENCES "VehicleRentalRequests"("Id") ON DELETE CASCADE,
    "OwnerId" UUID NOT NULL REFERENCES "OwnerProfiles"("Id") ON DELETE CASCADE,
    "VehicleId" UUID NOT NULL REFERENCES "Vehicles"("Id"),
    "PricePerDay" DECIMAL(18,2) NOT NULL,
    "TotalPrice" DECIMAL(18,2) NOT NULL,
    "OfferMessage" TEXT NOT NULL,
    "TermsAndConditions" TEXT,
    "IncludesDriver" BOOLEAN NOT NULL DEFAULT FALSE,
    "DriverFee" DECIMAL(18,2),
    "IncludesInsurance" BOOLEAN NOT NULL DEFAULT FALSE,
    "SecurityDeposit" DECIMAL(18,2),
    "Status" VARCHAR(50) NOT NULL DEFAULT 'Pending',
    "SubmittedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ResponsedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IX_RentalOffers_RentalRequestId" ON "RentalOffers"("RentalRequestId");
CREATE INDEX IF NOT EXISTS "IX_RentalOffers_OwnerId" ON "RentalOffers"("OwnerId");
CREATE INDEX IF NOT EXISTS "IX_RentalOffers_VehicleId" ON "RentalOffers"("VehicleId");
CREATE INDEX IF NOT EXISTS "IX_RentalOffers_Status" ON "RentalOffers"("Status");

-- Create VehicleRentalBookings table
CREATE TABLE IF NOT EXISTS "VehicleRentalBookings" (
    "Id" UUID PRIMARY KEY,
    "RentalRequestId" UUID NOT NULL REFERENCES "VehicleRentalRequests"("Id"),
    "RentalOfferId" UUID NOT NULL REFERENCES "RentalOffers"("Id"),
    "RenterId" UUID NOT NULL REFERENCES "Users"("Id"),
    "OwnerId" UUID NOT NULL REFERENCES "OwnerProfiles"("Id"),
    "VehicleId" UUID NOT NULL REFERENCES "Vehicles"("Id"),
    "StartDate" TIMESTAMP NOT NULL,
    "EndDate" TIMESTAMP NOT NULL,
    "DurationDays" INTEGER NOT NULL,
    "TotalAmount" DECIMAL(18,2) NOT NULL,
    "PickupLocation" TEXT NOT NULL,
    "DropoffLocation" TEXT NOT NULL,
    "Status" VARCHAR(50) NOT NULL DEFAULT 'Confirmed',
    "BookedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "StartedAt" TIMESTAMP,
    "CompletedAt" TIMESTAMP,
    "CancellationReason" TEXT,
    "CancelledAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IX_VehicleRentalBookings_RenterId" ON "VehicleRentalBookings"("RenterId");
CREATE INDEX IF NOT EXISTS "IX_VehicleRentalBookings_OwnerId" ON "VehicleRentalBookings"("OwnerId");
CREATE INDEX IF NOT EXISTS "IX_VehicleRentalBookings_VehicleId" ON "VehicleRentalBookings"("VehicleId");
CREATE INDEX IF NOT EXISTS "IX_VehicleRentalBookings_Status" ON "VehicleRentalBookings"("Status");

-- Add foreign key constraint for AcceptedOfferId
ALTER TABLE "VehicleRentalRequests" 
ADD CONSTRAINT "FK_VehicleRentalRequests_AcceptedOffer" 
FOREIGN KEY ("AcceptedOfferId") REFERENCES "RentalOffers"("Id");

PRINT 'Vehicle Rental Marketplace tables created successfully!';
