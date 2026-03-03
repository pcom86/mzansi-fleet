import client from './client';

export async function login(email, password) {
  const resp = await client.post('/Identity/login', { email, password });
  return resp.data;
}

export async function registerServiceProvider(body) {
  const resp = await client.post('/Identity/register-service-provider', body);
  return resp.data;
}

export async function createTenant(body) {
  const resp = await client.post('/Identity/tenants', body);
  return resp.data;
}

export async function createUser(body) {
  const resp = await client.post('/Identity/users', body);
  return resp.data;
}

export async function createOwnerProfile(body) {
  const resp = await client.post('/Identity/ownerprofiles', body);
  return resp.data;
}

export async function createDriverProfile(body) {
  const resp = await client.post('/Identity/driverprofiles', body);
  return resp.data;
}
