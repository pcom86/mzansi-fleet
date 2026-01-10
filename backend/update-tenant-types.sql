-- Update TenantType for all tenants except the specified one
-- This will set other tenants to 'Fleet Owner' to distinguish them from Taxi Associations

UPDATE "Tenants"
SET "TenantType" = 'Fleet Owner'
WHERE "Id" != 'edfed825-c3e2-4384-99fe-3cb3acfa51af'
  AND "TenantType" = 'Taxi Association';

-- Verify the update
SELECT "Id", "Name", "TenantType" 
FROM "Tenants" 
ORDER BY "TenantType", "Name";
