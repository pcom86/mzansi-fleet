import client from './client';

// Retrieves taxi ranks for a given tenant (association)
export function fetchTaxiRanks(tenantId) {
  return client.get(`/TaxiRanks?tenantId=${tenantId}`);
}

// Retrieves marshals assigned to a given taxi rank
export function fetchMarshals(taxiRankId) {
  return client.get(`/TaxiRankUsers/marshals?taxiRankId=${taxiRankId}`);
}

// Retrieves trips for a given taxi rank (optional)
export function fetchTrips(taxiRankId) {
  return client.get(`/TaxiRankTrips?taxiRankId=${taxiRankId}`);
}
