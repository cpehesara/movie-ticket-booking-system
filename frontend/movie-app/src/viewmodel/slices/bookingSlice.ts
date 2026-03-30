import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { bookingApi } from '../../model/api/bookingApi';
import { BookingResponse, CreateBookingRequest } from '../../model/types/booking.types';

interface BookingState {
  bookings: BookingResponse[];
  current: BookingResponse | null;
  loading: boolean;
  error: string | null;
}

const initialState: BookingState = { bookings: [], current: null, loading: false, error: null };

export const createBooking = createAsyncThunk(
  'bookings/create',
  async (data: CreateBookingRequest, { rejectWithValue }) => {
    try { return await bookingApi.create(data); }
    catch (e: any) { return rejectWithValue(e.response?.data?.message || 'Booking failed'); }
  }
);

export const fetchMyBookings = createAsyncThunk(
  'bookings/fetchMine',
  async (_, { rejectWithValue }) => {
    try { return await bookingApi.getMyBookings(); }
    catch (e: any) { return rejectWithValue(e.response?.data?.message || 'Failed to load bookings'); }
  }
);

export const cancelBooking = createAsyncThunk(
  'bookings/cancel',
  async (id: number, { rejectWithValue }) => {
    try { return await bookingApi.cancel(id); }
    catch (e: any) { return rejectWithValue(e.response?.data?.message || 'Cancellation failed'); }
  }
);

const bookingSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    clearCurrent: (state) => { state.current = null; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createBooking.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false; state.current = action.payload;
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      })
      .addCase(fetchMyBookings.pending, (state) => { state.loading = true; })
      .addCase(fetchMyBookings.fulfilled, (state, action) => {
        state.loading = false; state.bookings = action.payload;
      })
      .addCase(fetchMyBookings.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        state.bookings = state.bookings.map(b =>
          b.id === action.payload.id ? action.payload : b
        );
      });
  },
});

export const { clearCurrent, clearError } = bookingSlice.actions;
export default bookingSlice.reducer;