import client from './client';

export async function getAllTenders() {
  const resp = await client.get('/Tenders');
  return resp.data || [];
}

export async function getRecentTenders(days = 7) {
  const all = await getAllTenders();
  if (!Array.isArray(all)) return [];
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const sorted = all.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return sorted.filter(t => new Date(t.createdAt).getTime() >= cutoff);
}

export async function getTenderById(id) {
  const resp = await client.get(`/Tenders/${id}`);
  return resp.data;
}
