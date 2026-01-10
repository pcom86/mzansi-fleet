-- Migration: Add TenantId to Routes table
-- Date: 2026-01-11
-- Description: Links routes to taxi associations (tenants) for multi-tenant support

-- Add TenantId column to Routes table
ALTER TABLE "Routes" 
ADD COLUMN "TenantId" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Add foreign key constraint to Tenants table
ALTER TABLE "Routes"
ADD CONSTRAINT "FK_Routes_Tenants_TenantId" 
FOREIGN KEY ("TenantId") 
REFERENCES "Tenants"("Id") 
ON DELETE CASCADE;

-- Create index on TenantId for performance
CREATE INDEX "IX_Routes_TenantId" ON "Routes" ("TenantId");

-- Remove the default constraint (was only needed for existing rows)
ALTER TABLE "Routes" 
ALTER COLUMN "TenantId" DROP DEFAULT;
