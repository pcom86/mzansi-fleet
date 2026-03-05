import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';

const ConnectivityContext = createContext();

const HEALTH_URL = `${API_URL.replace(/\/api\/?$/, '')}/api/health`;
const POLL_INTERVAL_MS = 10000; // check every 10s
const TIMEOUT_MS = 5000;

export function ConnectivityProvider({ children }) {
  const [isBackendReachable, setIsBackendReachable] = useState(true);
  const intervalRef = useRef(null);

  async function checkHealth() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const resp = await fetch(HEALTH_URL, { method: 'GET', signal: controller.signal });
      clearTimeout(timer);
      setIsBackendReachable(resp.ok);
    } catch {
      setIsBackendReachable(false);
    }
  }

  useEffect(() => {
    checkHealth();
    intervalRef.current = setInterval(checkHealth, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <ConnectivityContext.Provider value={{ isBackendReachable, checkHealth }}>
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity() {
  return useContext(ConnectivityContext);
}
