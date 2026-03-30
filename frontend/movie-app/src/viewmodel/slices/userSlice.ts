import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userApi } from '../../model/api/userApi';
import { UserResponse, UpdateProfileRequest } from '../../model/types/user.types';

interface UserState {
  profile: UserResponse | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = { profile: null, loading: false, error: null };

export const fetchProfile = createAsyncThunk(
  'user/fetchProfile',
  async (_, { rejectWithValue }) => {
    try { return await userApi.getMe(); }
    catch (e: any) { return rejectWithValue(e.response?.data?.message || 'Failed to load profile'); }
  }
);

export const updateProfile = createAsyncThunk(
  'user/updateProfile',
  async (data: UpdateProfileRequest, { rejectWithValue }) => {
    try { return await userApi.updateProfile(data); }
    catch (e: any) { return rejectWithValue(e.response?.data?.message || 'Update failed'); }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => { state.loading = true; })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false; state.profile = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
      });
  },
});

export default userSlice.reducer;