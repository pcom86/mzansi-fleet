-- Activate all inactive driver user accounts
UPDATE "Users"
SET "IsActive" = true
WHERE "Role" = 'Driver' AND "IsActive" = false;

-- Activate all inactive driver profiles
UPDATE "DriverProfiles"
SET "IsActive" = true, "IsAvailable" = true
WHERE "IsActive" = false;

-- Show activated accounts
SELECT u."Email", u."Role", u."IsActive" as "UserActive", d."Name", d."IsActive" as "ProfileActive"
FROM "Users" u
LEFT JOIN "DriverProfiles" d ON u."Id" = d."UserId"
WHERE u."Role" = 'Driver';
