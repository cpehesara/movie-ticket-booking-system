// FILE PATH: src/viewmodel/slices/iotSlice.ts
//
// IoT Redux slice — tracks ESP32 device status, the live IoT event feed,
// and which seats are currently "in transit" (customer walked through the
// door but hasn't scanned their physical seat yet).
//
// Design pattern: Observer (Redux acts as the client-side event bus;
// WebSocket messages dispatch actions into this slice so every mounted
// component reacts to physical world changes automatically).

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axiosInstance from '../../model/services/axiosInstance';
import { IoTEvent, Esp32Status } from '../../model/types/iot_types';

const MAX_EVENTS = 50; // retain last 50 events in the live feed

// ─── State shape ─────────────────────────────────────────────────────────────

interface IoTState {
  events: IoTEvent[];
  /**
   * Seat IDs where the customer has already scanned at the entrance kiosk
   * but has NOT yet scanned the physical QR sticker on their seat.
   * These seats pulse amber in IoTMonitorPage and HallDisplayPage.
   */
  inTransitSeatIds: number[];
  esp32: Esp32Status;
  resyncing: boolean;
}

const initialState: IoTState = {
  events: [],
  inTransitSeatIds: [],
  esp32: {
    online: false,
    lastHeartbeat: null,
    screenId: null,
    ledCount: 0,
  },
  resyncing: false,
};

// ─── Async thunk ─────────────────────────────────────────────────────────────

/**
 * triggerResync — tells the backend to re-publish SET_LED commands for
 * every seat in the current showtime, restoring correct LED colours after
 * an ESP32 reconnection.
 */
export const triggerResync = createAsyncThunk(
  'iot/resync',
  async (screenId: number, { rejectWithValue }) => {
    try {
      await axiosInstance.post(`/admin/screens/${screenId}/resync-leds`);
    } catch (e: any) {
      return rejectWithValue(e.response?.data?.message ?? 'Resync failed');
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const iotSlice = createSlice({
  name: 'iot',
  initialState,
  reducers: {
    /**
     * receiveEvent — dispatched by webSocketService whenever a message
     * arrives on /topic/iot/{showtimeId}. Updates the event feed and
     * automatically transitions ESP32 status / in-transit seats.
     */
    receiveEvent(state, action: PayloadAction<IoTEvent>) {
      const event = action.payload;

      // Prepend so newest event appears first in the feed
      state.events = [event, ...state.events].slice(0, MAX_EVENTS);

      switch (event.type) {
        case 'DOOR_SCAN':
          if (event.seatId != null && !state.inTransitSeatIds.includes(event.seatId)) {
            state.inTransitSeatIds.push(event.seatId);
          }
          break;

        case 'SEAT_SCAN':
          state.inTransitSeatIds = state.inTransitSeatIds.filter(
            id => id !== event.seatId
          );
          break;

        case 'HEARTBEAT':
        case 'ESP32_ONLINE':
          state.esp32.online = true;
          state.esp32.lastHeartbeat = event.timestamp;
          if (event.message) {
            try {
              const meta = JSON.parse(event.message);
              if (meta.ledCount) state.esp32.ledCount = meta.ledCount;
              if (meta.screenId) state.esp32.screenId = meta.screenId;
            } catch { /* ignore malformed heartbeat payload */ }
          }
          break;

        case 'ESP32_OFFLINE':
          state.esp32.online = false;
          break;

        case 'RESYNC':
          state.inTransitSeatIds = [];
          break;

        default:
          break;
      }
    },

    /**
     * markInTransit — called by CheckinPage immediately after a successful
     * door scan so the amber pulse appears without waiting for the WebSocket
     * DOOR_SCAN event to arrive.
     */
    markInTransit(state, action: PayloadAction<number[]>) {
      action.payload.forEach(id => {
        if (!state.inTransitSeatIds.includes(id)) {
          state.inTransitSeatIds.push(id);
        }
      });
    },

    /** Remove one seat from in-transit (called after seat QR confirmed). */
    clearInTransit(state, action: PayloadAction<number>) {
      state.inTransitSeatIds = state.inTransitSeatIds.filter(
        id => id !== action.payload
      );
    },

    clearAllInTransit(state) {
      state.inTransitSeatIds = [];
    },

    clearEvents(state) {
      state.events = [];
    },

    setEsp32Status(state, action: PayloadAction<Partial<Esp32Status>>) {
      state.esp32 = { ...state.esp32, ...action.payload };
    },
  },
  extraReducers: builder => {
    builder
      .addCase(triggerResync.pending,   state => { state.resyncing = true;  })
      .addCase(triggerResync.fulfilled, state => { state.resyncing = false; })
      .addCase(triggerResync.rejected,  state => { state.resyncing = false; });
  },
});

export const {
  receiveEvent,
  markInTransit,
  clearInTransit,
  clearAllInTransit,
  clearEvents,
  setEsp32Status,
} = iotSlice.actions;

export default iotSlice.reducer;