-- Migration: Add TaxiRankAdmin, VehicleTaxiRank, and TripSchedule entities
-- Date: 2026-01-10
-- Description: Creates tables for Taxi Rank Admin role, vehicle-rank assignments, and trip schedules

-- Create TaxiRankAdmins table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'TaxiRankAdmins') THEN
        CREATE TABLE "TaxiRankAdmins" (
            "Id" UUID PRIMARY KEY,
            "UserId" UUID NOT NULL,
            "TenantId" UUID NOT NULL,
            "TaxiRankId" UUID NOT NULL,
            "AdminCode" VARCHAR(50) NOT NULL UNIQUE,
            "FullName" VARCHAR(200) NOT NULL,
            "PhoneNumber" VARCHAR(20) NOT NULL,
            "Email" VARCHAR(100),
            "HireDate" TIMESTAMP NOT NULL DEFAULT NOW(),
            "Status" VARCHAR(20) NOT NULL DEFAULT 'Active',
            "IdNumber" VARCHAR(50),
            "Address" TEXT,
            "CanManageMarshals" BOOLEAN NOT NULL DEFAULT TRUE,
            "CanManageVehicles" BOOLEAN NOT NULL DEFAULT TRUE,
            "CanManageSchedules" BOOLEAN NOT NULL DEFAULT TRUE,
            "CanViewReports" BOOLEAN NOT NULL DEFAULT TRUE,
            "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
            "UpdatedAt" TIMESTAMP,
            CONSTRAINT "FK_TaxiRankAdmins_Users" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE,
            CONSTRAINT "FK_TaxiRankAdmins_Tenants" FOREIGN KEY ("TenantId") REFERENCES "Tenants"("Id") ON DELETE CASCADE,
            CONSTRAINT "FK_TaxiRankAdmins_TaxiRanks" FOREIGN KEY ("TaxiRankId") REFERENCES "TaxiRanks"("Id") ON DELETE CASCADE
        );

        -- Create indexes for TaxiRankAdmins
        CREATE INDEX "IX_TaxiRankAdmins_UserId" ON "TaxiRankAdmins"("UserId");
        CREATE INDEX "IX_TaxiRankAdmins_TenantId" ON "TaxiRankAdmins"("TenantId");
        CREATE INDEX "IX_TaxiRankAdmins_TaxiRankId" ON "TaxiRankAdmins"("TaxiRankId");
        CREATE INDEX "IX_TaxiRankAdmins_AdminCode" ON "TaxiRankAdmins"("AdminCode");
        CREATE INDEX "IX_TaxiRankAdmins_Status" ON "TaxiRankAdmins"("Status");

        RAISE NOTICE 'TaxiRankAdmins table created successfully';
    ELSE
        RAISE NOTICE 'TaxiRankAdmins table already exists';
    END IF;
END $$;

-- Create VehicleTaxiRanks table (junction table for vehicle-rank assignments)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'VehicleTaxiRanks') THEN
        CREATE TABLE "VehicleTaxiRanks" (
            "Id" UUID PRIMARY KEY,
            "VehicleId" UUID NOT NULL,
            "TaxiRankId" UUID NOT NULL,
            "AssignedDate" TIMESTAMP NOT NULL DEFAULT NOW(),
            "RemovedDate" TIMESTAMP,
            "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
            "Notes" TEXT,
            CONSTRAINT "FK_VehicleTaxiRanks_Vehicles" FOREIGN KEY ("VehicleId") REFERENCES "Vehicles"("Id") ON DELETE CASCADE,
            CONSTRAINT "FK_VehicleTaxiRanks_TaxiRanks" FOREIGN KEY ("TaxiRankId") REFERENCES "TaxiRanks"("Id") ON DELETE CASCADE
        );

        -- Create indexes for VehicleTaxiRanks
        CREATE INDEX "IX_VehicleTaxiRanks_VehicleId" ON "VehicleTaxiRanks"("VehicleId");
        CREATE INDEX "IX_VehicleTaxiRanks_TaxiRankId" ON "VehicleTaxiRanks"("TaxiRankId");
        CREATE INDEX "IX_VehicleTaxiRanks_IsActive" ON "VehicleTaxiRanks"("IsActive");
        CREATE INDEX "IX_VehicleTaxiRanks_AssignedDate" ON "VehicleTaxiRanks"("AssignedDate");

        RAISE NOTICE 'VehicleTaxiRanks table created successfully';
    ELSE
        RAISE NOTICE 'VehicleTaxiRanks table already exists';
    END IF;
END $$;

-- Create TripSchedules table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'TripSchedules') THEN
        CREATE TABLE "TripSchedules" (
            "Id" UUID PRIMARY KEY,
            "TaxiRankId" UUID NOT NULL,
            "TenantId" UUID NOT NULL,
            "RouteName" VARCHAR(200) NOT NULL,
            "DepartureStation" VARCHAR(200) NOT NULL,
            "DestinationStation" VARCHAR(200) NOT NULL,
            "DepartureTime" TIME NOT NULL,
            "FrequencyMinutes" INTEGER NOT NULL,
            "DaysOfWeek" VARCHAR(50) NOT NULL,
            "StandardFare" DECIMAL(18, 2) NOT NULL,
            "ExpectedDurationMinutes" INTEGER,
            "MaxPassengers" INTEGER,
            "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
            "Notes" TEXT,
            "CreatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
            "UpdatedAt" TIMESTAMP,
            CONSTRAINT "FK_TripSchedules_TaxiRanks" FOREIGN KEY ("TaxiRankId") REFERENCES "TaxiRanks"("Id") ON DELETE CASCADE,
            CONSTRAINT "FK_TripSchedules_Tenants" FOREIGN KEY ("TenantId") REFERENCES "Tenants"("Id") ON DELETE CASCADE
        );

        -- Create indexes for TripSchedules
        CREATE INDEX "IX_TripSchedules_TaxiRankId" ON "TripSchedules"("TaxiRankId");
        CREATE INDEX "IX_TripSchedules_TenantId" ON "TripSchedules"("TenantId");
        CREATE INDEX "IX_TripSchedules_IsActive" ON "TripSchedules"("IsActive");
        CREATE INDEX "IX_TripSchedules_DepartureTime" ON "TripSchedules"("DepartureTime");
        CREATE INDEX "IX_TripSchedules_RouteName" ON "TripSchedules"("RouteName");

        RAISE NOTICE 'TripSchedules table created successfully';
    ELSE
        RAISE NOTICE 'TripSchedules table already exists';
    END IF;
END $$;

-- Summary
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration completed: Taxi Rank Admin Module';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Tables created/verified:';
    RAISE NOTICE '1. TaxiRankAdmins - Admin profiles for rank management';
    RAISE NOTICE '2. VehicleTaxiRanks - Vehicle-to-rank assignments';
    RAISE NOTICE '3. TripSchedules - Scheduled trip routes';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '- Register taxi rank admins via POST /api/TaxiRankAdmin/register';
    RAISE NOTICE '- Assign vehicles to ranks via POST /api/TaxiRankAdmin/{id}/assign-vehicle';
    RAISE NOTICE '- Create trip schedules via POST /api/TaxiRankAdmin/{id}/create-schedule';
    RAISE NOTICE '- Assign marshals to ranks via POST /api/TaxiRankAdmin/{id}/assign-marshal';
    RAISE NOTICE '============================================';
END $$;
