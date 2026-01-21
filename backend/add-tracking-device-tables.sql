-- Migration: Add Tracking Device Installation tables
-- Run this in PostgreSQL to add support for tracking device installation requests and offers

-- Create TrackingDeviceRequests table
CREATE TABLE IF NOT EXISTS "TrackingDeviceRequests" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "OwnerId" uuid NOT NULL,
    "TenantId" uuid NOT NULL,
    "VehicleId" uuid NOT NULL,
    "VehicleRegistration" text NOT NULL DEFAULT '',
    "VehicleMake" text NOT NULL DEFAULT '',
    "VehicleModel" text NOT NULL DEFAULT '',
    "VehicleYear" integer NOT NULL DEFAULT 0,
    "PreferredInstallationDate" text NOT NULL DEFAULT '',
    "InstallationLocation" text NOT NULL DEFAULT '',
    "DeviceFeatures" text NOT NULL DEFAULT '',
    "SpecialRequirements" text NOT NULL DEFAULT '',
    "BudgetMin" numeric(18,2) NULL,
    "BudgetMax" numeric(18,2) NULL,
    "Status" character varying(50) NOT NULL DEFAULT 'Open',
    "CreatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" timestamp with time zone NULL,
    "OfferCount" integer NOT NULL DEFAULT 0,
    CONSTRAINT "FK_TrackingDeviceRequests_OwnerProfiles" FOREIGN KEY ("OwnerId") REFERENCES "OwnerProfiles"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_TrackingDeviceRequests_Vehicles" FOREIGN KEY ("VehicleId") REFERENCES "Vehicles"("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_TrackingDeviceRequests_OwnerId" ON "TrackingDeviceRequests" ("OwnerId");
CREATE INDEX IF NOT EXISTS "IX_TrackingDeviceRequests_VehicleId" ON "TrackingDeviceRequests" ("VehicleId");
CREATE INDEX IF NOT EXISTS "IX_TrackingDeviceRequests_Status" ON "TrackingDeviceRequests" ("Status");
CREATE INDEX IF NOT EXISTS "IX_TrackingDeviceRequests_CreatedAt" ON "TrackingDeviceRequests" ("CreatedAt");

-- Create TrackingDeviceOffers table
CREATE TABLE IF NOT EXISTS "TrackingDeviceOffers" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "TrackingDeviceRequestId" uuid NOT NULL,
    "ServiceProviderId" uuid NOT NULL,
    "DeviceBrand" text NOT NULL DEFAULT '',
    "DeviceModel" text NOT NULL DEFAULT '',
    "DeviceFeatures" text NOT NULL DEFAULT '',
    "InstallationDetails" text NOT NULL DEFAULT '',
    "DeviceCost" numeric(18,2) NOT NULL DEFAULT 0,
    "InstallationCost" numeric(18,2) NOT NULL DEFAULT 0,
    "MonthlySubscriptionFee" numeric(18,2) NOT NULL DEFAULT 0,
    "TotalUpfrontCost" numeric(18,2) NOT NULL DEFAULT 0,
    "WarrantyPeriod" text NOT NULL DEFAULT '',
    "SupportDetails" text NOT NULL DEFAULT '',
    "AvailableFrom" timestamp with time zone NOT NULL,
    "EstimatedInstallationTime" text NOT NULL DEFAULT '',
    "AdditionalNotes" text NOT NULL DEFAULT '',
    "Status" character varying(50) NOT NULL DEFAULT 'Pending',
    "SubmittedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ResponsedAt" timestamp with time zone NULL,
    CONSTRAINT "FK_TrackingDeviceOffers_TrackingDeviceRequests" FOREIGN KEY ("TrackingDeviceRequestId") REFERENCES "TrackingDeviceRequests"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_TrackingDeviceOffers_ServiceProviderProfiles" FOREIGN KEY ("ServiceProviderId") REFERENCES "ServiceProviderProfiles"("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_TrackingDeviceOffers_TrackingDeviceRequestId" ON "TrackingDeviceOffers" ("TrackingDeviceRequestId");
CREATE INDEX IF NOT EXISTS "IX_TrackingDeviceOffers_ServiceProviderId" ON "TrackingDeviceOffers" ("ServiceProviderId");
CREATE INDEX IF NOT EXISTS "IX_TrackingDeviceOffers_Status" ON "TrackingDeviceOffers" ("Status");
CREATE INDEX IF NOT EXISTS "IX_TrackingDeviceOffers_SubmittedAt" ON "TrackingDeviceOffers" ("SubmittedAt");

COMMENT ON TABLE "TrackingDeviceRequests" IS 'Stores tracking device installation requests from vehicle owners';
COMMENT ON TABLE "TrackingDeviceOffers" IS 'Stores offers from tracking companies for device installation';
