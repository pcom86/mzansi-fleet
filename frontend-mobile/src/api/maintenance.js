import client from './client';

export async function getMechanicalRequests() {
  const resp = await client.get('/MechanicalRequests');
  return resp.data || [];
}

export async function getMechanicalRequestById(requestId) {
  if (!requestId) return null;
  const resp = await client.get(`/MechanicalRequests/${requestId}`);
  return resp.data;
}

export async function approveMechanicalRequest(requestId) {
  const resp = await client.put(`/MechanicalRequests/${requestId}/approve`, {});
  return resp.data;
}

export async function declineMechanicalRequest(requestId, reason) {
  const resp = await client.put(`/MechanicalRequests/${requestId}/decline`, { reason });
  return resp.data;
}

export async function scheduleMechanicalRequest(requestId, body) {
  const resp = await client.put(`/MechanicalRequests/${requestId}/schedule`, body);
  return resp.data;
}

export async function completeMechanicalRequest(requestId, body) {
  const resp = await client.put(`/MechanicalRequests/${requestId}/complete`, body);
  return resp.data;
}

export async function createMechanicalRequest(body) {
  const resp = await client.post('/MechanicalRequests', body);
  return resp.data;
}

export async function getMyProviderBookings() {
  const resp = await client.get('/MechanicalRequests/my-bookings');
  return resp.data || [];
}

export async function getProviderSchedule(businessName) {
  const resp = await client.get(`/MechanicalRequests/provider-schedule/${encodeURIComponent(businessName)}`);
  return resp.data || [];
}

export async function acceptMechanicalRequest(requestId) {
  const resp = await client.put(`/MechanicalRequests/${requestId}/accept`, {});
  return resp.data;
}

export async function startMechanicalRequest(requestId) {
  const resp = await client.put(`/MechanicalRequests/${requestId}/start`, {});
  return resp.data;
}

export async function deleteMechanicalRequest(requestId) {
  const resp = await client.delete(`/MechanicalRequests/${requestId}`);
  return resp.data;
}

export async function deleteMechanicalRequestByProvider(requestId) {
  const resp = await client.delete(`/MechanicalRequests/${requestId}/provider`);
  return resp.data;
}

export async function updateMechanicalRequest(requestId, body) {
  const resp = await client.put(`/MechanicalRequests/${requestId}`, body);
  return resp.data;
}
