-- Fix tenants with null Code values
UPDATE "Tenants" 
SET "Code" = 'TNT-' || UPPER(SUBSTRING("Name" FROM 1 FOR 10)) || '-' || LPAD(CAST(EXTRACT(EPOCH FROM NOW())::bigint % 1000000 AS TEXT), 6, '0')
WHERE "Code" IS NULL OR "Code" = '';

-- Show updated tenants
SELECT "Id", "Name", "Code" FROM "Tenants";
