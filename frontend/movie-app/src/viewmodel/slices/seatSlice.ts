import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { seatApi } from '../../model/api/seatApi';
import { SeatMapResponse, SeatWebSocketUpdate } from '../../model/types/seat.types';

interface SeatState {
  seatMap: SeatMapResponse | null;
  selectedSeatIds: number[];
  loading: boolean;
  error: string | null;
}

const initialState: SeatState = {
  seatMap: null,
  selectedSeatIds: [],
  loading: false,
  error: null,
};

export const fetchSeatMap = createAsyncThunk(
  'seats/fetchMap',
  async (showtimeId: number, { rejectWithValue }) => {
    try { return await seatApi.getSeatMap(showtimeId); }
    catch (e: any) { return rejectWithValue(e.response?.data?.message || 'Failed to load seat map'); }
  }
);

const seatSlice = createSlice({
  name: 'seats',
  initialState,
  reducers: {
    // Real-time WebSocket update — patches a single seat without re-fetching the whole map
    applySeatUpdate(state, action: PayloadAction<SeatWebSocketUpdate>) {
      if (!state.seatMap) return;
      const { seatId, seatState } = action.payload;
      state.seatMap.seats = state.seatMap.seats.map(s =>
        s.seatId === seatId ? { ...s, seatState } : s
      );
      // Recompute available count
      state.seatMap.availableCount = state.seatMap.seats.filter(
        s => s.seatState === 'AVAILABLE' && s.isActive
      ).length;
      // Deselect if someone else took this seat
      if (seatState !== 'AVAILABLE') {
        state.selectedSeatIds = state.selectedSeatIds.filter(id => id !== seatId);
      }
    },
    toggleSeatSelection(state, action: PayloadAction<number>) {
      const id = action.payload;
      if (state.selectedSeatIds.includes(id)) {
        state.selectedSeatIds = state.selectedSeatIds.filter(s => s !== id);
      } else if (state.selectedSeatIds.length < 10) {
        state.selectedSeatIds.push(id);
      }
    },
    clearSelection(state) { state.selectedSeatIds = []; },
    clearSeatMap(state) { state.seatMap = null; state.selectedSeatIds = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSeatMap.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchSeatMap.fulfilled, (state, action) => {
        state.loading = false; state.seatMap = action.payload; state.selectedSeatIds = [];
      })
      .addCase(fetchSeatMap.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      });
  },
});

export const { applySeatUpdate, toggleSeatSelection, clearSelection, clearSeatMap } = seatSlice.actions;
export default seatSlice.reducer;