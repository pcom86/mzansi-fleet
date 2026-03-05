import client from './client';

export async function getAvailableServiceProviderProfiles() {
  const resp = await client.get('/ServiceProviderProfiles/available');
  return resp.data || [];
}

export async function getActiveServiceProviderProfiles() {
  const resp = await client.get('/ServiceProviderProfiles/active');
  return resp.data || [];
}

export async function getMyServiceProviderProfile() {
  const resp = await client.get('/ServiceProviderProfiles/my-profile');
  return resp.data || null;
}

export async function updateMyServiceProviderProfile(body) {
  const resp = await client.put('/ServiceProviderProfiles/my-profile', body);
  return resp.data || null;
}

export async function toggleServiceProviderAvailability(profileId) {
  const resp = await client.patch(`/ServiceProviderProfiles/${profileId}/toggle-availability`);
  return resp.data || null;
}
