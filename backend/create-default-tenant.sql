-- Create default tenant for public service provider registration
INSERT INTO "Tenants" ("Id", "Name", "ContactEmail", "ContactPhone")
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Default Tenant', 'admin@mzansifleet.com', '+27 11 000 0000')
ON CONFLICT ("Id") DO NOTHING;
