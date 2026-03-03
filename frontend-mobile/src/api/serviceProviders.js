import client from './client';

export async function getActiveServiceProviders() {
  const resp = await client.get('/ServiceProviders/active');
  return resp.data || [];
}

export async function getServiceProvidersByServiceType(serviceType) {
  if (!serviceType) return getActiveServiceProviders();
  const resp = await client.get(`/ServiceProviders/by-service-type/${encodeURIComponent(serviceType)}`);
  return resp.data || [];
}
