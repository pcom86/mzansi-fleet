import client from './client';

// ── Original Queue Management API ─────────────────────────────────────

// Get queue for a taxi rank (all routes) for a given date
export async function getQueueByRank(rankId, date) {
  const params = date ? `?date=${date}` : '';
  const resp = await client.get(`/DailyTaxiQueue/by-rank/${rankId}${params}`);
  return resp.data;
}

// Get queue for a specific route for a given date
export async function getQueueByRoute(routeId, date) {
  const params = date ? `?date=${date}` : '';
  const resp = await client.get(`/DailyTaxiQueue/by-route/${routeId}${params}`);
  return resp.data;
}

// Add a vehicle to the queue
export async function addToQueue({ taxiRankId, routeId, vehicleId, driverId, tenantId, queueDate, notes }) {
  const resp = await client.post('/DailyTaxiQueue', {
    taxiRankId, routeId, vehicleId, driverId, tenantId, queueDate, notes,
  });
  return resp.data;
}

// Dispatch a vehicle (mark as departed)
export async function dispatchVehicle(queueEntryId, { dispatchedByUserId, passengerCount, passengers } = {}) {
  const resp = await client.put(`/DailyTaxiQueue/${queueEntryId}/dispatch`, {
    dispatchedByUserId, passengerCount, passengers,
  });
  return resp.data;
}

// Reorder a vehicle in the queue
export async function reorderVehicle(queueEntryId, newPosition) {
  const resp = await client.put(`/DailyTaxiQueue/${queueEntryId}/reorder`, {
    newPosition,
  });
  return resp.data;
}

// Remove a vehicle from the queue
export async function removeFromQueue(queueEntryId) {
  const resp = await client.put(`/DailyTaxiQueue/${queueEntryId}/remove`);
  return resp.data;
}

// Get queue statistics for a rank
export async function getQueueStats(rankId, date) {
  const params = date ? `?date=${date}` : '';
  const resp = await client.get(`/DailyTaxiQueue/stats/${rankId}${params}`);
  return resp.data;
}

// Get route stops for destination selection
export async function getRouteStops(routeId) {
  const resp = await client.get(`/Routes/${routeId}`);
  return resp.data?.stops || [];
}

// ── Enhanced Queue Management API ─────────────────────────────────────

// Get comprehensive queue overview with route breakdown
export async function getQueueOverview(taxiRankId, date) {
  const params = date ? `?date=${date}` : '';
  const resp = await client.get(`/QueueManagement/overview/${taxiRankId}${params}`);
  return resp.data;
}

// Get available vehicles for assignment
export async function getAvailableVehicles(taxiRankId) {
  const resp = await client.get(`/QueueManagement/vehicle-availability/${taxiRankId}`);
  return resp.data;
}

// Assign vehicle to queue with enhanced options
export async function assignVehicleToQueue({ taxiRankId, routeId, vehicleId, driverId, tenantId, notes }) {
  const resp = await client.post('/QueueManagement/assign-vehicle', {
    taxiRankId, routeId, vehicleId, driverId, tenantId, notes,
  });
  return resp.data;
}

// Bulk assign multiple vehicles to queue
export async function bulkAssignVehicles(taxiRankId, assignments) {
  const resp = await client.post('/QueueManagement/bulk-assign', {
    taxiRankId,
    assignments,
  });
  return resp.data;
}

// Priority dispatch with enhanced options
export async function priorityDispatch(queueId, { dispatchedByUserId, passengerCount, priority, reason }) {
  const resp = await client.put(`/QueueManagement/priority-dispatch/${queueId}`, {
    dispatchedByUserId, passengerCount, priority, reason,
  });
  return resp.data;
}

// Get queue analytics and reporting
export async function getQueueAnalytics(taxiRankId, startDate, endDate) {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const resp = await client.get(`/QueueManagement/analytics/${taxiRankId}?${params}`);
  return resp.data;
}

// ── Helper Functions ─────────────────────────────────────────────────────

// Format wait time in minutes
export function formatWaitTime(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Get status color based on queue status
export function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'waiting':
      return '#f59e0b'; // amber-500
    case 'loading':
      return '#3b82f6'; // blue-500
    case 'dispatched':
      return '#22c55e'; // green-500
    case 'removed':
      return '#ef4444'; // red-500
    default:
      return '#6b7280'; // gray-500
  }
}

// Get utilization color based on percentage
export function getUtilizationColor(utilization) {
  if (utilization >= 80) return '#ef4444'; // red - high utilization
  if (utilization >= 60) return '#f59e0b'; // amber - medium utilization
  return '#22c55e'; // green - low utilization
}

// Get wait time color based on minutes
export function getWaitTimeColor(waitTime) {
  if (waitTime <= 10) return '#22c55e'; // green - good
  if (waitTime <= 20) return '#f59e0b'; // amber - moderate
  return '#ef4444'; // red - poor
}

// Calculate queue efficiency metrics
export function calculateQueueMetrics(queueData) {
  const totalVehicles = queueData.length;
  const dispatchedVehicles = queueData.filter(q => q.status === 'Dispatched').length;
  const waitingVehicles = queueData.filter(q => q.status === 'Waiting').length;
  const loadingVehicles = queueData.filter(q => q.status === 'Loading').length;
  
  // Calculate average wait time for dispatched vehicles
  const dispatchedWithTime = queueData.filter(q => 
    q.status === 'Dispatched' && q.departedAt && q.createdAt
  );
  
  const averageWaitTime = dispatchedWithTime.length > 0 
    ? dispatchedWithTime.reduce((acc, q) => {
        const waitTime = new Date(q.departedAt) - new Date(q.createdAt);
        return acc + waitTime / (1000 * 60); // Convert to minutes
      }, 0) / dispatchedWithTime.length
    : 0;

  return {
    totalVehicles,
    dispatchedVehicles,
    waitingVehicles,
    loadingVehicles,
    averageWaitTime: Math.round(averageWaitTime),
    utilizationRate: totalVehicles > 0 ? (dispatchedVehicles / totalVehicles) * 100 : 0,
  };
}

// Sort queue by position and status
export function sortQueue(queueData) {
  return [...queueData].sort((a, b) => {
    // First sort by status (Waiting/Loading first, then Dispatched)
    const statusOrder = { 'Waiting': 0, 'Loading': 1, 'Dispatched': 2, 'Removed': 3 };
    const aStatus = statusOrder[a.status] || 999;
    const bStatus = statusOrder[b.status] || 999;
    
    if (aStatus !== bStatus) {
      return aStatus - bStatus;
    }
    
    // Then sort by queue position
    return a.queuePosition - b.queuePosition;
  });
}

// Filter queue by route
export function filterQueueByRoute(queueData, routeId) {
  if (!routeId) return queueData;
  return queueData.filter(q => q.routeId === routeId);
}

// Get next vehicle in queue
export function getNextVehicle(queueData) {
  const waitingVehicles = queueData.filter(q => q.status === 'Waiting' || q.status === 'Loading');
  return waitingVehicles.length > 0 ? waitingVehicles[0] : null;
}

// Validate vehicle assignment
export function validateVehicleAssignment(vehicle, existingQueue) {
  const isAlreadyQueued = existingQueue.some(q => 
    q.vehicleId === vehicle.id && 
    (q.status === 'Waiting' || q.status === 'Loading')
  );
  
  return {
    canAssign: !isAlreadyQueued,
    reason: isAlreadyQueued ? 'Vehicle is already in queue' : null,
  };
}
