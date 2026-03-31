import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { SeatWebSocketUpdate } from '../types/seat.types';
import { IoTEvent } from '../types/iot_types';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8080/ws';

let client: Client | null = null;
const subscriptions = new Map<string, () => void>();

export const wsService = {
  connect(): Promise<void> {
    if (client?.connected) return Promise.resolve();
    return new Promise((resolve, reject) => {
      client = new Client({
        webSocketFactory: () => new SockJS(WS_URL) as any,
        reconnectDelay: 5000,
        onConnect: () => resolve(),
        onStompError: (frame) => reject(new Error(frame.body)),
      });
      client.activate();
    });
  },

  /**
   * Subscribe to real-time seat state updates for a specific showtime.
   * The backend publishes a SeatWebSocketUpdate whenever any seat in this
   * showtime transitions between states (AVAILABLE, RESERVED, BOOKED, etc.).
   */
  subscribeSeatMap(
    showtimeId: number,
    onUpdate: (update: SeatWebSocketUpdate) => void
  ): () => void {
    if (!client?.connected) return () => {};

    const topic = `/topic/seats/${showtimeId}`;
    const sub = client.subscribe(topic, (msg) => {
      try {
        const update = JSON.parse(msg.body) as SeatWebSocketUpdate;
        onUpdate(update);
      } catch { /* malformed message — silently discard */ }
    });

    const key = `seats-${showtimeId}`;
    subscriptions.set(key, () => sub.unsubscribe());
    return () => {
      sub.unsubscribe();
      subscriptions.delete(key);
    };
  },

  /**
   * Subscribe to IoT events for a specific showtime.
   * The backend publishes on this topic for:
   *   - DOOR_SCAN: customer scanned their booking QR at the entrance kiosk
   *   - SEAT_SCAN: customer scanned the QR attached to their physical seat
   *   - LED_UPDATE: a SET_LED command was successfully delivered to the ESP32
   *   - HEARTBEAT: ESP32 alive-ping received
   *   - ESP32_ONLINE / ESP32_OFFLINE: connection state changes
   *   - RESYNC: admin triggered a full LED state resynchronisation
   */
  subscribeIoTEvents(
    showtimeId: number,
    onEvent: (event: IoTEvent) => void
  ): () => void {
    if (!client?.connected) return () => {};

    const topic = `/topic/iot/${showtimeId}`;
    const sub = client.subscribe(topic, (msg) => {
      try {
        const event = JSON.parse(msg.body) as IoTEvent;
        onEvent(event);
      } catch { /* ignore */ }
    });

    const key = `iot-${showtimeId}`;
    subscriptions.set(key, () => sub.unsubscribe());
    return () => {
      sub.unsubscribe();
      subscriptions.delete(key);
    };
  },

  /**
   * Subscribe to global ESP32 heartbeat / status topic (not showtime-scoped).
   * Useful for the admin IoT monitor to display device health.
   */
  subscribeEsp32Status(
    screenId: number,
    onEvent: (event: IoTEvent) => void
  ): () => void {
    if (!client?.connected) return () => {};

    const topic = `/topic/esp32/${screenId}/status`;
    const sub = client.subscribe(topic, (msg) => {
      try {
        const event = JSON.parse(msg.body) as IoTEvent;
        onEvent(event);
      } catch { /* ignore */ }
    });

    const key = `esp32-${screenId}`;
    subscriptions.set(key, () => sub.unsubscribe());
    return () => {
      sub.unsubscribe();
      subscriptions.delete(key);
    };
  },

  disconnect() {
    subscriptions.forEach(unsub => unsub());
    subscriptions.clear();
    client?.deactivate();
    client = null;
  },

  isConnected(): boolean {
    return client?.connected ?? false;
  },
};