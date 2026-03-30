import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminApi } from '../../model/api/adminApi';
import { BookingResponse } from '../../model/types/booking.types';
import { UserResponse } from '../../model/types/user.types';

interface AdminState {
  bookings: BookingResponse[];
  staff: UserResponse[];
  loading: boolean;
  error: string | null;
}

const initialState: AdminState = { bookings: [], staff: [], loading: false, error: null };

export const fetchAllBookings = createAsyncThunk(
  'admin/fetchBookings',
  async (_, { rejectWithValue }) => {
    try { return await adminApi.getAllBookings(); }
    catch (e: any) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
  }
);

export const fetchAllStaff = createAsyncThunk(
  'admin/fetchStaff',
  async (_, { rejectWithValue }) => {
    try { return await adminApi.getAllStaff(); }
    catch (e: any) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllBookings.pending, (state) => { state.loading = true; })
      .addCase(fetchAllBookings.fulfilled, (state, action) => {
        state.loading = false; state.bookings = action.payload;
      })
      .addCase(fetchAllBookings.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      })
      .addCase(fetchAllStaff.fulfilled, (state, action) => {
        state.staff = action.payload;
      });
  },
});

export default adminSlice.reducer;