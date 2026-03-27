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

// Update passengers on an existing queue booking
export async function updateQueueBooking(bookingId, data) {
  const resp = await client.put(`/QueueBooking/${bookingId}/update`, data);
  return resp.data;
}

// Rider check-in at the taxi rank
export async function checkInQueueBooking(bookingId) {
  const resp = await client.put(`/QueueBooking/${bookingId}/check-in`);
  return resp.data;
}

// Initiate Ozow EFT payment — returns { paymentUrl, transactionReference, amount, id }
export async function initiateOzowPayment(bookingId) {
  const resp = await client.post(`/QueueBooking/${bookingId}/ozow-payment`);
  return resp.data;
}

// Poll payment status — returns { id, paymentStatus, status, paymentMethod, paidAt, isPaid }
export async function getPaymentStatus(bookingId) {
  const resp = await client.get(`/QueueBooking/${bookingId}/payment-status`);
  return resp.data;
}

// DEV ONLY: Simulate a successful Ozow payment
export async function simulateOzowPayment(bookingId) {
  const resp = await client.post(`/QueueBooking/${bookingId}/simulate-payment`);
  return resp.data;
}

// Get bookings for a specific queue entry (Admin/Marshal)
export async function fetchQueueEntryBookings(queueEntryId) {
  const resp = await client.get(`/QueueBooking/queue-entry/${queueEntryId}/bookings`);
  return resp.data;
}

// Get all bookings for a rank on a date (Admin/Marshal)
export async function fetchRankBookings(rankId, date, status) {
  const params = {};
  if (date) params.date = date;
  if (status) params.status = status;
  const resp = await client.get(`/QueueBooking/rank/${rankId}/bookings`, { params });
  return resp.data;
}

// Allocate seat numbers to passengers in a booking (Admin/Marshal)
export async function allocateSeats(bookingId, allocations) {
  const resp = await client.put(`/QueueBooking/${bookingId}/allocate-seats`, { allocations });
  return resp.data;
}
