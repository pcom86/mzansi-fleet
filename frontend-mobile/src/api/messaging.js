import client from './client';

export async function getUnreadCount(userId) {
  if (!userId) return 0;
  const resp = await client.get(`/Messages/unread-count/${userId}`);
  return resp.data || 0;
}

export async function getInbox(userId) {
  const resp = await client.get(`/Messages/inbox/${userId}`);
  return resp.data || [];
}

export async function getSent(userId) {
  if (!userId) return [];
  const resp = await client.get(`/Messages/sent/${userId}`);
  return resp.data || [];
}

export async function sendMessage(payload) {
  const resp = await client.post('/Messages', payload);
  return resp.data;
}

export async function markAsRead(messageId) {
  if (!messageId) return;
  await client.put(`/Messages/${messageId}/mark-as-read`);
}
