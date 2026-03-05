import client from './client';

/**
 * Submit a rating and review for a completed mechanical request.
 * @param {Object} payload
 * @param {string} payload.requestId - Mechanical request ID
 * @param {number} payload.rating - 1-5 star rating
 * @param {string|null} payload.review - Optional review text
 * @param {'driver'|'owner'} payload.role - Who is submitting the review
 * @param {string} payload.userId - User ID of the reviewer
 * @returns {Promise<Object>} Created review record
 */
export async function submitMechanicalRequestReview(payload) {
  const response = await client.post(`/MechanicalRequests/${payload.requestId}/review`, payload);
  return response.data;
}

/**
 * Get reviews for a specific mechanical request.
 * @param {string} requestId
 * @returns {Promise<Array>} List of review objects
 */
export async function getMechanicalRequestReviews(requestId) {
  const response = await client.get(`/MechanicalRequests/${requestId}/reviews`);
  return response.data;
}

/**
 * Get reviews submitted by the current user (driver or owner).
 * @param {string} userId
 * @returns {Promise<Array>} List of review objects
 */
export async function getMyReviews(userId) {
  const response = await client.get(`/Reviews/my-reviews/${userId}`);
  return response.data;
}
