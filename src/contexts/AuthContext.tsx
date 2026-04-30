import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('capturism_admin_token');
  });

  const isAuthenticated = !!token;

  const login = useCallback(async (password: string) => {
    const relayUrl = 'wss://capturism-relay.onrender.com';
    const httpUrl = relayUrl.replace('ws://', 'http://').replace('wss://', 'https://');

    const res = await fetch(`${httpUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      throw new Error('Invalid password');
    }

    const data = await res.json();
    const jwt = data.token;
    localStorage.setItem('capturism_admin_token', jwt);
    setToken(jwt);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('capturism_admin_token');
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
