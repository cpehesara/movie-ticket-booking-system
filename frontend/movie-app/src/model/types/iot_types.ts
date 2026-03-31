// FILE PATH: src/model/types/iot_types.ts

export type IoTEventType =
  | 'DOOR_SCAN'       // customer scanned booking QR at entrance kiosk
  | 'SEAT_SCAN'       // customer scanned seat QR — now physically seated
  | 'LED_UPDATE'      // backend sent a SET_LED command to ESP32
  | 'HEARTBEAT'       // ESP32 alive ping received
  | 'ESP32_OFFLINE'   // heartbeat timed out
  | 'ESP32_ONLINE'    // ESP32 reconnected
  | 'RESYNC';         // admin triggered full LED resync

export interface IoTEvent {
  id: string;                     // uuid / timestamp string — used as list key
  type: IoTEventType;
  showtimeId?: number;
  seatId?: number;
  ledIndex?: number | null;
  rowLabel?: string;
  colNumber?: number;
  bookingCode?: string;
  customerName?: string;          // may be redacted to "Customer #X" for privacy
  timestamp: number;              // epoch ms
  success?: boolean;
  message?: string;
}

export interface Esp32Status {
  online: boolean;
  lastHeartbeat: number | null;   // epoch ms
  screenId: number | null;
  ledCount: number;
}

export interface LedResyncRequest {
  screenId: number;
  showtimeId: number;
}