import client from './client';

export async function getRequestsByTaxiRank(taxiRankId, status = null) {
  const params = status ? { status } : {};
  const resp = await client.get(`/VehicleTaxiRankRequests/taxirank/${taxiRankId}`, { params });
  return resp.data || [];
}

export async function getRequestsByUser(userId) {
  const resp = await client.get(`/VehicleTaxiRankRequests/user/${userId}`);
  return resp.data || [];
}

export async function getPendingRequestsCount(taxiRankId) {
  const resp = await client.get(`/VehicleTaxiRankRequests/taxirank/${taxiRankId}/pending-count`);
  return resp.data?.count || 0;
}

export async function createLinkRequest(request) {
  const resp = await client.post('/VehicleTaxiRankRequests', request);
  return resp.data;
}

export async function approveRequest(requestId, reviewedByUserId, reviewedByName) {
  const resp = await client.post(`/VehicleTaxiRankRequests/${requestId}/approve`, {
    reviewedByUserId,
    reviewedByName
  });
  return resp.data;
}

export async function rejectRequest(requestId, reviewedByUserId, reviewedByName, rejectionReason) {
  const resp = await client.post(`/VehicleTaxiRankRequests/${requestId}/reject`, {
    reviewedByUserId,
    reviewedByName,
    rejectionReason
  });
  return resp.data;
}

export async function searchVehiclesByRegistration(registration, tenantId = null) {
  const params = { registration };
  if (tenantId) params.tenantId = tenantId;
  const resp = await client.get('/VehicleTaxiRankRequests/search', { params });
  return resp.data || [];
}
