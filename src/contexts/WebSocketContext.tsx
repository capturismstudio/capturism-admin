import React, { createContext, useContext } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from './AuthContext';
import type { Booth, Transaction } from '../types';

interface WebSocketContextType {
  connected: boolean;
  booths: Booth[];
  transactions: Transaction[];
  sendCommand: (type: string, payload: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { token, logout } = useAuth();
  const ws = useWebSocket(token, logout);

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWS() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWS must be used within WebSocketProvider');
  return ctx;
}
