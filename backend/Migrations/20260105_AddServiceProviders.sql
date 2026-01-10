-- Migration: Add ServiceProviders table
-- Date: 2026-01-05

CREATE TABLE IF NOT EXISTS "ServiceProviders" (
    "Id" UUID PRIMARY KEY,
    "BusinessName" VARCHAR(255) NOT NULL,
    "RegistrationNumber" VARCHAR(100),
    "ContactPerson" VARCHAR(255) NOT NULL,
    "Phone" VARCHAR(50) NOT NULL,
    "Email" VARCHAR(255) NOT NULL,
    "Address" TEXT,
    "ServiceTypes" TEXT NOT NULL,
    "VehicleCategories" TEXT NOT NULL,
    "OperatingHours" VARCHAR(255),
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "HourlyRate" DECIMAL(18, 2),
    "CallOutFee" DECIMAL(18, 2),
    "ServiceRadiusKm" DOUBLE PRECISION,
    "BankAccount" TEXT,
    "TaxNumber" VARCHAR(100),
    "CertificationsLicenses" TEXT,
    "Rating" DOUBLE PRECISION,
    "TotalReviews" INTEGER,
    "Notes" TEXT,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "IX_ServiceProviders_IsActive" ON "ServiceProviders" ("IsActive");
CREATE INDEX IF NOT EXISTS "IX_ServiceProviders_BusinessName" ON "ServiceProviders" ("BusinessName");
CREATE INDEX IF NOT EXISTS "IX_ServiceProviders_Rating" ON "ServiceProviders" ("Rating");

-- Add some sample data (optional - remove if not needed)
-- INSERT INTO "ServiceProviders" (
--     "Id", "BusinessName", "RegistrationNumber", "ContactPerson", 
--     "Phone", "Email", "Address", "ServiceTypes", "VehicleCategories",
--     "OperatingHours", "IsActive", "HourlyRate", "CallOutFee",
--     "ServiceRadiusKm", "Rating", "TotalReviews", "CreatedAt"
-- ) VALUES (
--     '11111111-1111-1111-1111-111111111111',
--     'Ace Auto Repairs',
--     'REG123456',
--     'John Smith',
--     '+27 11 123 4567',
--     'contact@aceauto.co.za',
--     '123 Main Street, Johannesburg, 2001',
--     'Mechanical, Electrical, Routine Service',
--     'Sedan, SUV, Van, Truck',
--     'Mon-Fri: 8AM-5PM, Sat: 9AM-1PM',
--     TRUE,
--     350.00,
--     500.00,
--     50.0,
--     4.5,
--     25,
--     CURRENT_TIMESTAMP
-- );

COMMENT ON TABLE "ServiceProviders" IS 'Stores information about service and maintenance providers for fleet vehicles';
