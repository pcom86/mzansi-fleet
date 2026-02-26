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
