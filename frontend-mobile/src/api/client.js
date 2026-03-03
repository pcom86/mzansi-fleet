import axios from 'axios';
import { API_URL } from '../config';

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthToken(token) {
  if (token) client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete client.defaults.headers.common['Authorization'];
}

export default client;
