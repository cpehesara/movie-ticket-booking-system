import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { checkinApi } from '../../model/api/checkinApi';
import { seatArrivalApi } from '../../model/api/seatArrivalApi';
import { BookingResponse } from '../../model/types/booking.types';

interface CheckinState {
  result: BookingResponse | null;
  loading: boolean;
  error: string | null;
}

const initialState: CheckinState = { result: null, loading: false, error: null };

export const performCheckin = createAsyncThunk(
  'checkin/perform',
  async (bookingCode: string, { rejectWithValue }) => {
    try { return await checkinApi.checkin(bookingCode); }
    catch (e: any) { return rejectWithValue(e.response?.data?.message || 'Check-in failed'); }
  }
);

export const confirmSeatArrival = createAsyncThunk(
  'checkin/seatArrival',
  async ({ bookingCode, seatId }: { bookingCode: string; seatId: number }, { rejectWithValue }) => {
    try { return await seatArrivalApi.confirm(bookingCode, seatId); }
    catch (e: any) { return rejectWithValue(e.response?.data?.message || 'Seat confirmation failed'); }
  }
);

const checkinSlice = createSlice({
  name: 'checkin',
  initialState,
  reducers: {
    reset: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(performCheckin.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(performCheckin.fulfilled, (state, action) => {
        state.loading = false; state.result = action.payload;
      })
      .addCase(performCheckin.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      })
      .addCase(confirmSeatArrival.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(confirmSeatArrival.fulfilled, (state, action) => {
        state.loading = false; state.result = action.payload;
      })
      .addCase(confirmSeatArrival.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      });
  },
});

export const { reset } = checkinSlice.actions;
export default checkinSlice.reducer;