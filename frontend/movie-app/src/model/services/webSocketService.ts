import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { SeatWebSocketUpdate } from '../types/seat.types';
import { TrackingEvent } from '../types/tracking.types';
import { IoTEvent } from '../types/iot_types';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8080/ws';

let client: Client | null = null;
const subscriptions = new Map<string, () => void>();

export const wsService = {
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (client?.connected) { resolve(); return; }
      client = new Client({
        webSocketFactory: () => new SockJS(WS_URL) as any,
        reconnectDelay: 5000,
        onConnect:    () => resolve(),
        onStompError: (frame) => reject(new Error(frame.body)),
      });
      client.activate();
    });
  },

  /**
   * Subscribe to real-time seat state changes for a given showtime.
   * Used by: BookingPage, HallDisplayPage
   * Topic: /topic/seats/{showtimeId}
   */
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
    return () => { sub.unsubscribe(); subscriptions.delete(key); };
  },

  /**
   * Subscribe to the staff live-tracking topic for a given showtime.
   * Used by: LiveTrackingPage
   *
   * Receives TrackingEvent payloads whenever:
   *   - A customer scans their booking QR at the entrance door (DOOR_SCANNED)
   *   - A customer confirms at their physical seat (SEATED)
   *
   * Topic: /topic/tracking/{showtimeId}
   */
  subscribeTracking(
    showtimeId: number,
    onEvent: (event: TrackingEvent) => void
  ): () => void {
    if (!client?.connected) return () => {};

    const sub = client.subscribe(`/topic/tracking/${showtimeId}`, (msg) => {
      try {
        const event = JSON.parse(msg.body) as TrackingEvent;
        onEvent(event);
      } catch { /* ignore malformed */ }
    });

    const key = `tracking-${showtimeId}`;
    subscriptions.set(key, () => sub.unsubscribe());
    return () => { sub.unsubscribe(); subscriptions.delete(key); };
  },

  subscribeIoTEvents(
    showtimeId: number,
    onEvent: (event: IoTEvent) => void
  ): () => void {
    if (!client?.connected) return () => {};

    const sub = client.subscribe(`/topic/iot/${showtimeId}`, (msg) => {
      try {
        const event = JSON.parse(msg.body) as IoTEvent;
        onEvent(event);
      } catch { /* ignore malformed */ }
    });

    const key = `iot-${showtimeId}`;
    subscriptions.set(key, () => sub.unsubscribe());
    return () => { sub.unsubscribe(); subscriptions.delete(key); };
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