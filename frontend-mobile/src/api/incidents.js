import client from './client';

// Fetch incidents for a taxi rank
export async function fetchIncidentsByRank(taxiRankId, limit = 100) {
  const response = await client.get(`/Passengers/incidents?taxiRankId=${taxiRankId}&limit=${limit}`);
  return response.data;
}
