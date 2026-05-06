import { useEffect, useRef, useCallback, useState } from 'react';
import type { Booth, RelayMessage, Transaction, ProductCategory } from '../types';

const emptyDetailed = {
  photoColor: 0, photoImage: 0, photoCity: 0,
  calendarColor: 0, calendarImage: 0, calendarCity: 0,
  postcardColor: 0, postcardImage: 0, postcardCity: 0,
  idPhoto: 0,
};

const DEFAULT_BOOTHS: Booth[] = [
  {
    boothId: 'booth-mabillon',
    displayName: '5 Mabillon Paris',
    region: 'FR',
    online: false,
    lastSeen: null,
    stats: {
      totalRevenue: 0, monthlyRevenue: 0, weeklyRevenue: 0, dailyRevenue: 0,
      detailed: { ...emptyDetailed },
    },
  },
];

export function useWebSocket(token: string | null, onAuthFailed?: () => void) {
  const [connected, setConnected] = useState(false);
  const [booths, setBooths] = useState<Booth[]>(DEFAULT_BOOTHS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const retriesRef = useRef(0);
  const authFailedRef = useRef(onAuthFailed);
  authFailedRef.current = onAuthFailed;

  const sendCommand = useCallback((type: string, payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload, timestamp: new Date().toISOString() }));
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const relayUrl = 'wss://capturism-relay.onrender.com';
    const httpUrl = relayUrl.replace('wss://', 'https://').replace('ws://', 'http://');

    async function connect() {
      // Validate token via HTTP first — WebSocket close events don't expose
      // the 401 status, so we can't tell auth failure from a network blip.
      try {
        const res = await fetch(`${httpUrl}/api/booths`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (res.status === 401) {
          console.warn('[WS] Token rejected by relay — forcing re-login');
          authFailedRef.current?.();
          return;
        }
      } catch {
        // Network error — fall through and let WS retry handle it
      }
      if (cancelled) return;

      const ws = new WebSocket(`${relayUrl}/ws?type=admin&token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        retriesRef.current = 0;
      };

      ws.onclose = () => {
        setConnected(false);
        if (cancelled) return;
        const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 30000);
        retriesRef.current++;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => { ws.close(); };

      ws.onmessage = (event) => {
        try {
          const msg: RelayMessage = JSON.parse(event.data);
          handleMessage(msg);
        } catch { /* ignore malformed */ }
      };
    }

    function handleMessage(msg: RelayMessage) {
      switch (msg.type) {
        case 'relay:booth_list':
          if (Array.isArray(msg.payload?.booths)) {
            setBooths(prev => {
              const updated = [...prev];
              for (const b of msg.payload.booths) {
                const idx = updated.findIndex(x => x.boothId === b.boothId);
                if (idx >= 0) updated[idx] = { ...updated[idx], ...b };
              }
              return updated;
            });
          }
          break;

        case 'relay:booth_connected':
          setBooths(prev => prev.map(b =>
            b.boothId === msg.boothId ? { ...b, online: true, lastSeen: msg.timestamp } : b
          ));
          break;

        case 'relay:booth_disconnected':
          setBooths(prev => prev.map(b =>
            b.boothId === msg.boothId ? { ...b, online: false, lastSeen: msg.timestamp } : b
          ));
          break;

        case 'booth:session_complete':
          if (msg.boothId && msg.payload) {
            const { amount = 0, category: rawCategory, cardType = 'eu_debit', cardHash = '', transactionId } = msg.payload;
            const category = rawCategory as ProductCategory | undefined;
            if (!category) break;

            // Record transaction
            const tx: Transaction = {
              id: transactionId || `tx_${Date.now()}`,
              timestamp: msg.timestamp,
              amount,
              category,
              cardType,
              cardHash,
              boothId: msg.boothId,
            };
            setTransactions(prev => [...prev, tx]);

            // Update booth stats
            setBooths(prev => prev.map(b => {
              if (b.boothId !== msg.boothId) return b;
              return {
                ...b,
                stats: {
                  ...b.stats,
                  totalRevenue: b.stats.totalRevenue + amount,
                  monthlyRevenue: b.stats.monthlyRevenue + amount,
                  weeklyRevenue: b.stats.weeklyRevenue + amount,
                  dailyRevenue: b.stats.dailyRevenue + amount,
                  detailed: {
                    ...b.stats.detailed,
                    ...(b.stats.detailed[category] !== undefined
                      ? { [category]: b.stats.detailed[category] + amount }
                      : {}),
                  },
                },
              };
            }));
          }
          break;

        case 'booth:status':
          if (msg.boothId && msg.payload) {
            setBooths(prev => prev.map(b =>
              b.boothId === msg.boothId ? { ...b, ...msg.payload, lastSeen: msg.timestamp } : b
            ));
          }
          break;

        case 'booth:error':
          console.error(`[Booth ${msg.boothId}]`, msg.payload);
          break;
      }
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [token]);

  return { connected, booths, transactions, sendCommand };
}
