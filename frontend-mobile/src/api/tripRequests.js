import client from './client';

export async function createTripRequest(body) {
  const resp = await client.post('/TripRequests', body);
  return resp.data;
}

export async function getMyTripRequests(passengerId) {
  const resp = await client.get(`/TripRequests/passenger/${passengerId}`);
  return resp.data;
}

export async function getPendingTripRequests(routeId) {
  const endpoint = routeId
    ? `/TripRequests/route/${routeId}?status=Requested`
    : '/TripRequests?status=Requested';
  const resp = await client.get(endpoint);
  return resp.data;
}

export async function getPendingRequestsByRank(rankId) {
  const resp = await client.get(`/TripRequests/rank/${rankId}?status=Requested`);
  return resp.data;
}

export async function getAllTripRequests(status, driverId) {
  const query = [];
  if (status) query.push(`status=${status}`);
  if (driverId) query.push(`driverId=${driverId}`);
  const q = query.length ? `?${query.join('&')}` : '';
  const resp = await client.get(`/TripRequests${q}`);
  return resp.data;
}

export async function getTripRequest(id) {
  const resp = await client.get(`/TripRequests/${id}`);
  return resp.data;
}

export async function acceptTripRequest(id, driverId, offerPrice = 0) {
  const resp = await client.post(`/TripRequests/${id}/accept`, { driverId, offerPrice });
  return resp.data;
}

export async function startTripRequest(id, driverId) {
  const resp = await client.put(`/TripRequests/${id}/start`, { driverId });
  return resp.data;
}

export async function completeTripRequest(id, distanceKm, ratePerKm, totalPrice) {
  const resp = await client.put(`/TripRequests/${id}/complete`, { distanceKm, ratePerKm, totalPrice });
  return resp.data;
}

export async function cancelTripRequest(id) {
  const resp = await client.put(`/TripRequests/${id}/cancel`, {});
  return resp.data;
}
