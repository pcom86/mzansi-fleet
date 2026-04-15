import client from './client';

// Fetch drivers for a taxi rank (by tenant)
export async function fetchDriversByTenant(tenantId) {
  const response = await client.get(`/Drivers?tenantId=${tenantId}`);
  return response.data;
}
