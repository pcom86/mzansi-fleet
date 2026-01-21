-- Migration: Add Tender and TenderApplication tables
-- Date: 2026-01-15

-- Create Tenders table
CREATE TABLE IF NOT EXISTS "Tenders" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "Title" text NOT NULL,
    "Description" text NOT NULL,
    "RequirementDetails" text NOT NULL,
    "BudgetMin" numeric(18,2) NULL,
    "BudgetMax" numeric(18,2) NULL,
    "TransportType" text NOT NULL,
    "RequiredVehicles" integer NULL,
    "RouteDetails" text NOT NULL,
    "StartDate" timestamp without time zone NOT NULL,
    "EndDate" timestamp without time zone NOT NULL,
    "ApplicationDeadline" timestamp without time zone NULL,
    "PickupLocation" text NOT NULL,
    "DropoffLocation" text NOT NULL,
    "ServiceArea" text NOT NULL,
    "TenderPublisherId" uuid NOT NULL,
    "Status" text NOT NULL,
    "AwardedToOwnerId" uuid NULL,
    "CreatedAt" timestamp without time zone NOT NULL,
    "UpdatedAt" timestamp without time zone NOT NULL,
    "IsActive" boolean NOT NULL,
    CONSTRAINT "FK_Tenders_Users_TenderPublisherId" FOREIGN KEY ("TenderPublisherId") REFERENCES "Users" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Tenders_OwnerProfiles_AwardedToOwnerId" FOREIGN KEY ("AwardedToOwnerId") REFERENCES "OwnerProfiles" ("Id") ON DELETE SET NULL
);

-- Create TenderApplications table
CREATE TABLE IF NOT EXISTS "TenderApplications" (
    "Id" uuid NOT NULL PRIMARY KEY,
    "TenderId" uuid NOT NULL,
    "OwnerId" uuid NOT NULL,
    "ApplicationMessage" text NOT NULL,
    "ProposedBudget" numeric(18,2) NOT NULL,
    "ProposalDetails" text NOT NULL,
    "AvailableVehicles" integer NOT NULL,
    "VehicleTypes" text NOT NULL,
    "ExperienceHighlights" text NOT NULL,
    "Status" text NOT NULL,
    "AppliedAt" timestamp without time zone NOT NULL,
    "ReviewedAt" timestamp without time zone NULL,
    "ReviewNotes" text NULL,
    "ContactPerson" text NOT NULL,
    "ContactPhone" text NOT NULL,
    "ContactEmail" text NOT NULL,
    CONSTRAINT "FK_TenderApplications_Tenders_TenderId" FOREIGN KEY ("TenderId") REFERENCES "Tenders" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_TenderApplications_OwnerProfiles_OwnerId" FOREIGN KEY ("OwnerId") REFERENCES "OwnerProfiles" ("Id") ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "IX_Tenders_TenderPublisherId" ON "Tenders" ("TenderPublisherId");
CREATE INDEX IF NOT EXISTS "IX_Tenders_AwardedToOwnerId" ON "Tenders" ("AwardedToOwnerId");
CREATE INDEX IF NOT EXISTS "IX_Tenders_Status" ON "Tenders" ("Status");
CREATE INDEX IF NOT EXISTS "IX_Tenders_IsActive" ON "Tenders" ("IsActive");
CREATE INDEX IF NOT EXISTS "IX_TenderApplications_TenderId" ON "TenderApplications" ("TenderId");
CREATE INDEX IF NOT EXISTS "IX_TenderApplications_OwnerId" ON "TenderApplications" ("OwnerId");
CREATE INDEX IF NOT EXISTS "IX_TenderApplications_Status" ON "TenderApplications" ("Status");
