-- Migration: Add ServiceProviderRating to MechanicalRequests and MaintenanceHistories
-- Date: 2026-01-09
-- Description: Add rating field (1-5 stars) for service provider ratings when completing maintenance requests

-- Add ServiceProviderRating column to MechanicalRequests table
ALTER TABLE "MechanicalRequests" 
ADD COLUMN "ServiceProviderRating" INTEGER NULL;

-- Add comment to describe the column
COMMENT ON COLUMN "MechanicalRequests"."ServiceProviderRating" IS 'Service provider rating (1-5 stars) provided when completing the maintenance request';

-- Add ServiceProviderRating column to MaintenanceHistories table  
ALTER TABLE "MaintenanceHistories"
ADD COLUMN "ServiceProviderRating" INTEGER NULL;

-- Add comment to describe the column
COMMENT ON COLUMN "MaintenanceHistories"."ServiceProviderRating" IS 'Service provider rating (1-5 stars) recorded from the completed maintenance request';

-- Add check constraint to ensure rating is between 1 and 5 if provided
ALTER TABLE "MechanicalRequests"
ADD CONSTRAINT "CK_MechanicalRequests_ServiceProviderRating" 
CHECK ("ServiceProviderRating" IS NULL OR ("ServiceProviderRating" >= 1 AND "ServiceProviderRating" <= 5));

ALTER TABLE "MaintenanceHistories"
ADD CONSTRAINT "CK_MaintenanceHistories_ServiceProviderRating"
CHECK ("ServiceProviderRating" IS NULL OR ("ServiceProviderRating" >= 1 AND "ServiceProviderRating" <= 5));
