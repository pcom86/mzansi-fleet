-- Drop and recreate with proper casing
DROP TABLE IF EXISTS "VehicleRentalBookings" CASCADE;
DROP TABLE IF EXISTS "RentalOffers" CASCADE;
DROP TABLE IF EXISTS "VehicleRentalRequests" CASCADE;

-- Create tables with exact column names matching Entity Framework
CREATE TABLE "VehicleRentalRequests" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "UserId" uuid NOT NULL,
    "TenantId" uuid NOT NULL,
    "VehicleType" text NOT NULL,
    "SeatingCapacity" integer NULL,
    "PickupLocation" text NOT NULL,
    "DropoffLocation" text NOT NULL,
    "StartDate" timestamp without time zone NOT NULL,
    "EndDate" timestamp without time zone NOT NULL,
    "DurationDays" integer NOT NULL,
    "TripPurpose" text NOT NULL,
    "SpecialRequirements" text NULL,
    "BudgetMin" numeric(18,2) NULL,
    "BudgetMax" numeric(18,2) NULL,
    "Status" text NOT NULL DEFAULT 'Open',
    "CreatedAt" timestamp without time zone NOT NULL DEFAULT NOW(),
    "ClosedAt" timestamp without time zone NULL,
    "AcceptedOfferId" uuid NULL,
    CONSTRAINT "FK_VehicleRentalRequests_Users" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_VehicleRentalRequests_Tenants" FOREIGN KEY ("TenantId") REFERENCES "Tenants"("Id") ON DELETE CASCADE
);

CREATE TABLE "RentalOffers" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "RentalRequestId" uuid NOT NULL,
    "OwnerId" uuid NOT NULL,
    "VehicleId" uuid NOT NULL,
    "PricePerDay" numeric(18,2) NOT NULL,
    "TotalPrice" numeric(18,2) NOT NULL,
    "OfferMessage" text NOT NULL,
    "TermsAndConditions" text NULL,
    "IncludesDriver" boolean NOT NULL DEFAULT FALSE,
    "DriverFee" numeric(18,2) NULL,
    "IncludesInsurance" boolean NOT NULL DEFAULT FALSE,
    "SecurityDeposit" numeric(18,2) NULL,
    "Status" text NOT NULL DEFAULT 'Pending',
    "SubmittedAt" timestamp without time zone NOT NULL DEFAULT NOW(),
    "ResponsedAt" timestamp without time zone NULL,
    CONSTRAINT "FK_RentalOffers_VehicleRentalRequests" FOREIGN KEY ("RentalRequestId") REFERENCES "VehicleRentalRequests"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_RentalOffers_OwnerProfiles" FOREIGN KEY ("OwnerId") REFERENCES "OwnerProfiles"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_RentalOffers_Vehicles" FOREIGN KEY ("VehicleId") REFERENCES "Vehicles"("Id") ON DELETE CASCADE
);

CREATE TABLE "VehicleRentalBookings" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "RentalRequestId" uuid NOT NULL,
    "RentalOfferId" uuid NOT NULL,
    "RenterId" uuid NOT NULL,
    "OwnerId" uuid NOT NULL,
    "VehicleId" uuid NOT NULL,
    "StartDate" timestamp without time zone NOT NULL,
    "EndDate" timestamp without time zone NOT NULL,
    "DurationDays" integer NOT NULL,
    "TotalAmount" numeric(18,2) NOT NULL,
    "PickupLocation" text NOT NULL,
    "DropoffLocation" text NOT NULL,
    "Status" text NOT NULL DEFAULT 'Confirmed',
    "BookedAt" timestamp without time zone NOT NULL DEFAULT NOW(),
    "StartedAt" timestamp without time zone NULL,
    "CompletedAt" timestamp without time zone NULL,
    "CancellationReason" text NULL,
    "CancelledAt" timestamp without time zone NULL,
    CONSTRAINT "FK_VehicleRentalBookings_VehicleRentalRequests" FOREIGN KEY ("RentalRequestId") REFERENCES "VehicleRentalRequests"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_VehicleRentalBookings_RentalOffers" FOREIGN KEY ("RentalOfferId") REFERENCES "RentalOffers"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_VehicleRentalBookings_Users" FOREIGN KEY ("RenterId") REFERENCES "Users"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_VehicleRentalBookings_OwnerProfiles" FOREIGN KEY ("OwnerId") REFERENCES "OwnerProfiles"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_VehicleRentalBookings_Vehicles" FOREIGN KEY ("VehicleId") REFERENCES "Vehicles"("Id") ON DELETE CASCADE
);

-- Create Indexes
CREATE INDEX "IX_VehicleRentalRequests_UserId" ON "VehicleRentalRequests"("UserId");
CREATE INDEX "IX_VehicleRentalRequests_Status" ON "VehicleRentalRequests"("Status");
CREATE INDEX "IX_VehicleRentalRequests_StartDate" ON "VehicleRentalRequests"("StartDate");
CREATE INDEX "IX_RentalOffers_RentalRequestId" ON "RentalOffers"("RentalRequestId");
CREATE INDEX "IX_RentalOffers_OwnerId" ON "RentalOffers"("OwnerId");
CREATE INDEX "IX_RentalOffers_VehicleId" ON "RentalOffers"("VehicleId");
CREATE INDEX "IX_RentalOffers_Status" ON "RentalOffers"("Status");
CREATE INDEX "IX_VehicleRentalBookings_RenterId" ON "VehicleRentalBookings"("RenterId");
CREATE INDEX "IX_VehicleRentalBookings_OwnerId" ON "VehicleRentalBookings"("OwnerId");
CREATE INDEX "IX_VehicleRentalBookings_VehicleId" ON "VehicleRentalBookings"("VehicleId");
CREATE INDEX "IX_VehicleRentalBookings_Status" ON "VehicleRentalBookings"("Status");
