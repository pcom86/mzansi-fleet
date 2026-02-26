import client from './client';

export async function getAllVehicles() {
  const resp = await client.get('/Vehicles');
  return resp.data || [];
}

export async function getVehicleById(id) {
  const resp = await client.get(`/Vehicles/${id}`);
  return resp.data;
}

export async function getVehiclesByTenantId(tenantId) {
  if (!tenantId) return [];
  const resp = await client.get(`/Vehicles/tenant/${tenantId}`);
  return resp.data || [];
}

export async function createVehicle(vehicle) {
  const resp = await client.post('/Vehicles', vehicle);
  return resp.data;
}

export async function updateVehicle(id, vehicle) {
  const resp = await client.put(`/Vehicles/${id}`, vehicle);
  return resp.data;
}

export async function deleteVehicle(id) {
  const resp = await client.delete(`/Vehicles/${id}`);
  return resp.data;
}

export async function getVehiclesByOwner(ownerId) {
  const all = await getAllVehicles();
  return (all || []).filter(v => v.ownerId === ownerId || v.ownerId === ownerId?.toString());
}
