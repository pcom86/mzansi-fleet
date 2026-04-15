import client from './client';

// Fetch reviews for a taxi rank
export async function fetchReviewsByRank(taxiRankId, params = {}) {
  const query = new URLSearchParams({ taxiRankId, limit: params.limit || 100 });
  if (params.driverId) query.append('driverId', params.driverId);
  if (params.vehicleId) query.append('vehicleId', params.vehicleId);
  if (params.date) query.append('date', params.date);
  const response = await client.get(`/Passengers/reviews?${query.toString()}`);
  return response.data;
}
