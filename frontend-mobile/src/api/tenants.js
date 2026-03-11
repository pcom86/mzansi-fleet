import client from './client';

// Get all tenants/associations
export function fetchAllTenants() {
  return client.get('/Tenants');
}

// Get tenant by ID
export function fetchTenantById(tenantId) {
  return client.get(`/Tenants/${tenantId}`);
}

// Get tenant by code
export function fetchTenantByCode(code) {
  return client.get(`/Tenants/code/${code}`);
}

// Create new tenant
export async function createTenant(tenantData) {
  const resp = await client.post('/Tenants', tenantData);
  return resp.data;
}
