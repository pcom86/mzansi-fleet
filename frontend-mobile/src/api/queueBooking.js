import client from './client';

// Get taxi ranks with active queues
export async function fetchRanksWithQueues() {
  const resp = await client.get('/QueueBooking/ranks');
  return resp.data;
}

// Get live queue at a taxi rank
export async function fetchLiveQueue(rankId, date) {
  const params = {};
  if (date) params.date = date;
  const resp = await client.get(`/QueueBooking/rank/${rankId}/live-queue`, { params });
  return resp.data;
}

// Create a queue booking (book seats on a queued vehicle)
export async function createQueueBooking(data) {
  const resp = await client.post('/QueueBooking', data);
  return resp.data;
}

// Confirm EFT payment for a queue booking
export async function confirmQueuePayment(bookingId, bankReference) {
  const resp = await client.put(`/QueueBooking/${bookingId}/confirm-payment`, { bankReference });
  return resp.data;
}

// Get rider's queue bookings
export async function fetchUserQueueBookings(userId) {
  const resp = await client.get(`/QueueBooking/user/${userId}`);
  return resp.data;
}

// Cancel a queue booking
export async function cancelQueueBooking(bookingId, reason) {
  const resp = await client.put(`/QueueBooking/${bookingId}/cancel`, { reason });
  return resp.data;
}
