import client from './client';

// Get driver scoreboard for a tenant (owner's fleet)
export async function fetchDriverScoreboard(tenantId) {
  const resp = await client.get(`/DriverBehavior/scoreboard/${tenantId}`);
  return resp.data;
}

// Get behavior events for a specific driver
export async function fetchDriverEvents(driverId, limit = 50) {
  const resp = await client.get(`/DriverBehavior/driver/${driverId}?limit=${limit}`);
  return resp.data;
}

// Get all behavior events for a tenant
export async function fetchTenantEvents(tenantId, limit = 100) {
  const resp = await client.get(`/DriverBehavior/tenant/${tenantId}?limit=${limit}`);
  return resp.data;
}

// Record a new behavior event
export async function recordBehaviorEvent(body) {
  const resp = await client.post('/DriverBehavior', body);
  return resp.data;
}

// Resolve a behavior event
export async function resolveBehaviorEvent(eventId, resolution) {
  const resp = await client.put(`/DriverBehavior/${eventId}/resolve`, { resolution });
  return resp.data;
}

// Get passenger ratings for a specific driver
export async function fetchDriverRatings(driverId, limit = 50) {
  const resp = await client.get(`/DriverBehavior/driver/${driverId}/ratings?limit=${limit}`);
  return resp.data;
}

// Delete a behavior event
export async function deleteBehaviorEvent(eventId) {
  const resp = await client.delete(`/DriverBehavior/${eventId}`);
  return resp.data;
}

// Behavior categories with point values (used by frontend forms)
export const BEHAVIOR_CATEGORIES = [
  { key: 'Speeding',       label: 'Speeding',           points: -10, type: 'Negative', severity: 'High',     icon: 'speedometer-outline' },
  { key: 'HarshBraking',   label: 'Harsh Braking',      points: -5,  type: 'Negative', severity: 'Medium',   icon: 'warning-outline' },
  { key: 'HarshAcceleration', label: 'Harsh Acceleration', points: -5, type: 'Negative', severity: 'Medium', icon: 'flash-outline' },
  { key: 'Accident',       label: 'Accident',           points: -25, type: 'Negative', severity: 'Critical', icon: 'car-outline' },
  { key: 'TrafficViolation', label: 'Traffic Violation', points: -15, type: 'Negative', severity: 'High',    icon: 'alert-circle-outline' },
  { key: 'PhoneUsage',     label: 'Phone While Driving', points: -10, type: 'Negative', severity: 'High',   icon: 'phone-portrait-outline' },
  { key: 'Fatigue',        label: 'Fatigue / Drowsiness', points: -10, type: 'Negative', severity: 'High',  icon: 'moon-outline' },
  { key: 'PassengerComplaint', label: 'Passenger Complaint', points: -8, type: 'Negative', severity: 'Medium', icon: 'chatbubble-ellipses-outline' },
  { key: 'VehicleDamage',  label: 'Vehicle Damage',     points: -15, type: 'Negative', severity: 'High',    icon: 'construct-outline' },
  { key: 'LateArrival',    label: 'Late Arrival',       points: -3,  type: 'Negative', severity: 'Low',     icon: 'time-outline' },
  { key: 'OnTimeBonus',    label: 'On-Time Bonus',      points: 5,   type: 'Positive', severity: 'Low',     icon: 'checkmark-circle-outline' },
  { key: 'SafeDriving',    label: 'Safe Driving Award',  points: 10,  type: 'Positive', severity: 'Low',    icon: 'shield-checkmark-outline' },
  { key: 'Compliment',     label: 'Passenger Compliment', points: 5,  type: 'Positive', severity: 'Low',    icon: 'heart-outline' },
  { key: 'PerfectMonth',   label: 'Perfect Month',      points: 15,  type: 'Positive', severity: 'Low',     icon: 'trophy-outline' },
  { key: 'Other',          label: 'Other',              points: 0,   type: 'Neutral',  severity: 'Medium',   icon: 'ellipsis-horizontal-outline' },
];
