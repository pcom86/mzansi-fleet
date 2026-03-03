import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin } from '../api/identity';
import { setAuthToken } from '../api/client';

const AUTH_TOKEN_KEY = 'mf_token';
const AUTH_USER_KEY = 'mf_user';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function canUseSecureStore() {
    try {
      return await SecureStore.isAvailableAsync();
    } catch {
      return false;
    }
  }

  async function getItem(key) {
    if (await canUseSecureStore()) {
      return SecureStore.getItemAsync(key);
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  }

  async function setItem(key, value) {
    if (await canUseSecureStore()) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }

  async function removeItem(key) {
    if (await canUseSecureStore()) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  }

  useEffect(() => {
    (async () => {
      const t = await getItem(AUTH_TOKEN_KEY);
      const u = await getItem(AUTH_USER_KEY);
      if (t) {
        setToken(t);
        setAuthToken(t);
      }
      if (u) setUser(JSON.parse(u));
      setLoading(false);
    })();
  }, []);

  async function signIn(email, password) {
    const resp = await apiLogin(email, password);
    // apiLogin returns resp.data which should be LoginResponseDto { token, userId, email, role, tenantId, expiresAt, fullName }
    const tok = resp?.token || (resp && resp.data && resp.data.token);
    const usr = {
      id: resp?.userId || (resp && resp.data && resp.data.userId) || null,
      email: resp?.email || (resp && resp.data && resp.data.email) || email,
      role: resp?.role || (resp && resp.data && resp.data.role) || null,
      fullName: resp?.fullName || (resp && resp.data && resp.data.fullName) || null,
      tenantId: resp?.tenantId || (resp && resp.data && resp.data.tenantId) || null,
    };
    if (!tok) throw new Error('No token returned from login');
    await setItem(AUTH_TOKEN_KEY, tok);
    await setItem(AUTH_USER_KEY, JSON.stringify(usr));
    setToken(tok);
    setUser(usr);
    setAuthToken(tok);
    return resp;
  }

  async function signOut() {
    await removeItem(AUTH_TOKEN_KEY);
    await removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
    setAuthToken(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
