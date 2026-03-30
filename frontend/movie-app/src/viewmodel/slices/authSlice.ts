import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../../model/api/authApi';
import { AuthResponse, LoginRequest, RegisterRequest } from '../../model/types/auth.types';

interface AuthState {
  user: AuthResponse | null;
  loading: boolean;
  error: string | null;
}

const stored = localStorage.getItem('authUser');
const initialState: AuthState = {
  user: stored ? JSON.parse(stored) : null,
  loading: false,
  error: null,
};

export const login = createAsyncThunk('auth/login', async (data: LoginRequest, { rejectWithValue }) => {
  try {
    const res = await authApi.login(data);
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('authUser', JSON.stringify(res));
    return res;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.message || 'Login failed');
  }
});

export const register = createAsyncThunk('auth/register', async (data: RegisterRequest, { rejectWithValue }) => {
  try {
    const res = await authApi.register(data);
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('authUser', JSON.stringify(res));
    return res;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.message || 'Registration failed');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
  localStorage.clear();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(register.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(register.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(logout.fulfilled, (state) => { state.user = null; });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;