import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { SeatWebSocketUpdate } from '../types/seat.types';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8080/ws';

let client: Client | null = null;
const subscriptions = new Map<string, () => void>();

export const wsService = {
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      client = new Client({
        webSocketFactory: () => new SockJS(WS_URL),
        reconnectDelay: 5000,
        onConnect: () => resolve(),
        onStompError: (frame) => reject(new Error(frame.body)),
      });
      client.activate();
    });
  },

  subscribeSeatMap(
    showtimeId: number,
    onUpdate: (update: SeatWebSocketUpdate) => void
  ): () => void {
    if (!client?.connected) return () => {};

    const sub = client.subscribe(`/topic/seats/${showtimeId}`, (msg) => {
      try {
        const update = JSON.parse(msg.body) as SeatWebSocketUpdate;
        onUpdate(update);
      } catch { /* ignore malformed */ }
    });

    const key = `seats-${showtimeId}`;
    subscriptions.set(key, () => sub.unsubscribe());
    return () => {
      sub.unsubscribe();
      subscriptions.delete(key);
    };
  },

  disconnect() {
    subscriptions.forEach((unsub) => unsub());
    subscriptions.clear();
    client?.deactivate();
    client = null;
  },

  isConnected(): boolean {
    return client?.connected ?? false;
  },
};