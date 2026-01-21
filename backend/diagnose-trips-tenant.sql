-- Diagnose Trips and Tenant Relationship
-- ========================================

-- 1. Check if Trips table has TenantId column
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Trips' AND column_name = 'TenantId'
        ) 
        THEN '✓ Trips table HAS TenantId column'
        ELSE '✗ Trips table DOES NOT have TenantId column (filtered through Vehicle)'
    END as trips_tenantid_status;

-- 2. Database Statistics
SELECT 
    (SELECT COUNT(*) FROM "Trips") as total_trips,
    (SELECT COUNT(*) FROM "Vehicles") as total_vehicles,
    (SELECT COUNT(*) FROM "Vehicles" WHERE "TenantId" IS NOT NULL) as vehicles_with_tenant,
    (SELECT COUNT(DISTINCT "TenantId") FROM "Vehicles" WHERE "TenantId" IS NOT NULL) as tenants_with_vehicles,
    (SELECT COUNT(*) FROM "Tenants") as total_tenants;

-- 3. Trips-to-Vehicles Relationship
SELECT 
    COUNT(DISTINCT t."VehicleId") as vehicles_with_trips,
    COUNT(*) as total_trip_records
FROM "Trips" t
INNER JOIN "Vehicles" v ON t."VehicleId" = v."Id";

-- 4. Tenant-wise Breakdown
SELECT 
    t."Name" as tenant_name,
    t."Id" as tenant_id,
    COUNT(DISTINCT v."Id") as vehicle_count,
    COUNT(trip."Id") as trip_count
FROM "Tenants" t
LEFT JOIN "Vehicles" v ON v."TenantId" = t."Id"
LEFT JOIN "Trips" trip ON trip."VehicleId" = v."Id"
GROUP BY t."Id", t."Name"
ORDER BY trip_count DESC;

-- 5. Vehicles without TenantId (ISSUE)
SELECT 
    COUNT(*) as vehicles_without_tenant
FROM "Vehicles"
WHERE "TenantId" IS NULL;

-- 6. Sample: Vehicles with their trips
SELECT 
    v."Registration" as vehicle,
    t."Name" as tenant,
    COUNT(trip."Id") as trip_count,
    MIN(trip."TripDate") as first_trip,
    MAX(trip."TripDate") as last_trip
FROM "Vehicles" v
LEFT JOIN "Tenants" t ON v."TenantId" = t."Id"
LEFT JOIN "Trips" trip ON trip."VehicleId" = v."Id"
GROUP BY v."Id", v."Registration", t."Name"
ORDER BY trip_count DESC
LIMIT 10;
