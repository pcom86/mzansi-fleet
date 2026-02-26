import client from './client';

export async function getAvailableServiceProviderProfiles() {
  const resp = await client.get('/ServiceProviderProfiles/available');
  return resp.data || [];
}

export async function getActiveServiceProviderProfiles() {
  const resp = await client.get('/ServiceProviderProfiles/active');
  return resp.data || [];
}
