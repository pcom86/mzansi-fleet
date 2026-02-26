import client from './client';

export async function getVehicleEarnings(vehicleId) {
  if (!vehicleId) return [];
  const resp = await client.get(`/VehicleEarnings/vehicle/${vehicleId}`);
  return resp.data || [];
}

export async function getVehicleExpenses(vehicleId) {
  if (!vehicleId) return [];
  const resp = await client.get(`/VehicleExpenses/vehicle/${vehicleId}`);
  return resp.data || [];
}

export async function createVehicleEarning(payload) {
  const resp = await client.post('/VehicleEarnings', payload);
  return resp.data;
}

export async function createVehicleExpense(payload) {
  const resp = await client.post('/VehicleExpenses', payload);
  return resp.data;
}

export async function deleteVehicleEarning(id) {
  const resp = await client.delete(`/VehicleEarnings/${id}`);
  return resp.data;
}

export async function deleteVehicleExpense(id) {
  const resp = await client.delete(`/VehicleExpenses/${id}`);
  return resp.data;
}
