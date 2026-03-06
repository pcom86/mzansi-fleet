import client from './client';

// Retrieves taxi ranks for a given tenant (association)
export function fetchTaxiRanks(tenantId) {
  return client.get(`/TaxiRanks?tenantId=${tenantId}`);
}

// Retrieves all taxi ranks
export function fetchAllTaxiRanks() {
  return client.get('/TaxiRanks');
}

// Creates a new taxi rank
export async function createTaxiRank(body) {
  const resp = await client.post('/TaxiRanks', body);
  return resp.data;
}

// Registers a taxi rank user (TaxiMarshal or TaxiRankAdmin)
export async function registerTaxiRankUser(body) {
  const resp = await client.post('/TaxiRankUsers/register', body);
  return resp.data;
}

// Retrieves marshals assigned to a given taxi rank
export function fetchMarshals(taxiRankId) {
  return client.get(`/TaxiRankUsers/marshals?taxiRankId=${taxiRankId}`);
}

// Retrieves trips for a given taxi rank
export function fetchTrips(taxiRankId) {
  return client.get(`/TaxiRankTrips/rank/${taxiRankId}`);
}

// Get taxi rank by id
export function fetchTaxiRankById(rankId) {
  return client.get(`/TaxiRanks/${rankId}`);
}

// Update taxi rank details
export async function updateTaxiRank(rankId, body) {
  const resp = await client.put(`/TaxiRanks/${rankId}`, body);
  return resp.data;
}

// Get admin profile by userId
export function fetchAdminByUserId(userId) {
  return client.get(`/TaxiRankAdmin/user/${userId}`);
}

// Fetch routes/schedules for an admin
export function fetchSchedules(adminId) {
  return client.get(`/TaxiRankAdmin/${adminId}/schedules`);
}

// Create a route/schedule
export async function createSchedule(adminId, body) {
  const resp = await client.post(`/TaxiRankAdmin/${adminId}/create-schedule`, body);
  return resp.data;
}

// Update a route/schedule
export async function updateSchedule(adminId, scheduleId, body) {
  const resp = await client.put(`/TaxiRankAdmin/${adminId}/update-schedule/${scheduleId}`, body);
  return resp.data;
}

// Delete a route/schedule
export async function deleteSchedule(adminId, scheduleId) {
  const resp = await client.delete(`/TaxiRankAdmin/${adminId}/delete-schedule/${scheduleId}`);
  return resp.data;
}

// Browse available scheduled trips (optionally filter by taxiRankId)
export function fetchAvailableSchedules(taxiRankId) {
  const q = taxiRankId ? `?taxiRankId=${taxiRankId}` : '';
  return client.get(`/ScheduledTripBookings/schedules${q}`);
}

// Book a seat on a scheduled trip
export async function createTripBooking(body) {
  const resp = await client.post('/ScheduledTripBookings', body);
  return resp.data;
}

// Get bookings for a user
export function fetchUserBookings(userId) {
  return client.get(`/ScheduledTripBookings/user/${userId}`);
}

// Cancel a booking
export async function cancelTripBooking(bookingId, reason) {
  const resp = await client.put(`/ScheduledTripBookings/${bookingId}/cancel`, { reason });
  return resp.data;
}

// Assign vehicle to route
export async function assignVehicleToRoute(adminId, scheduleId, vehicleId, notes) {
  const resp = await client.post(`/TaxiRankAdmin/${adminId}/schedules/${scheduleId}/assign-vehicle`, {
    vehicleId,
    notes
  });
  return resp.data;
}

// Unassign vehicle from route
export async function unassignVehicleFromRoute(adminId, scheduleId, vehicleId) {
  const resp = await client.delete(`/TaxiRankAdmin/${adminId}/schedules/${scheduleId}/unassign-vehicle/${vehicleId}`);
  return resp.data;
}

// Get bookings for a rank (admin view)
export function fetchRankBookings(taxiRankId) {
  return client.get(`/ScheduledTripBookings/rank/${taxiRankId}`);
}

// === Trip Capture (Marshal) ===

// Create a new departing trip
export async function createTrip(body) {
  const resp = await client.post('/TaxiRankTrips', body);
  return resp.data;
}

// Add a passenger to a trip (marshal-friendly, no JWT needed)
export async function addPassengerToTrip(tripId, body) {
  const resp = await client.post(`/TaxiRankTrips/${tripId}/passengers/add`, body);
  return resp.data;
}

// Get passengers for a trip
export function fetchTripPassengers(tripId) {
  return client.get(`/TaxiRankTrips/${tripId}/passengers`);
}

// Remove a passenger from a trip
export async function removePassengerFromTrip(tripId, passengerId) {
  const resp = await client.delete(`/TaxiRankTrips/${tripId}/passengers/${passengerId}`);
  return resp.data;
}

// Update trip status (Departed, InTransit, Arrived, Completed)
export async function updateTripStatus(tripId, status) {
  const resp = await client.put(`/TaxiRankTrips/${tripId}/status`, { status });
  return resp.data;
}

// Get today's trips
export function fetchTodayTrips(tenantId) {
  const q = tenantId ? `?tenantId=${tenantId}` : '';
  return client.get(`/TaxiRankTrips/today${q}`);
}

// Get trips for a specific rank
export function fetchTripsByRank(taxiRankId) {
  return client.get(`/TaxiRankTrips/rank/${taxiRankId}`);
}

// Fetch vehicles assigned to a rank (via admin)
export function fetchRankVehicles(adminId) {
  return client.get(`/TaxiRankAdmin/${adminId}/vehicles`);
}

// === Taxi Rank Association (linking ranks to associations/tenants) ===

// Link a taxi rank to an association (tenant)
export async function linkTaxiRankToAssociation(taxiRankId, tenantId, isPrimary = false) {
  const resp = await client.post(`/TaxiRanks/${taxiRankId}/associations/${tenantId}?isPrimary=${isPrimary}`);
  return resp.data;
}

// Unlink a taxi rank from an association (tenant)
export async function unlinkTaxiRankFromAssociation(taxiRankId, tenantId) {
  const resp = await client.delete(`/TaxiRanks/${taxiRankId}/associations/${tenantId}`);
  return resp.data;
}

// Get all associations for a taxi rank
export function fetchTaxiRankAssociations(taxiRankId) {
  return client.get(`/TaxiRanks/${taxiRankId}/associations`);
}
