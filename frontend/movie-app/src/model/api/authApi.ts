import axiosInstance from '../services/axiosInstance';
import { AuthResponse, LoginRequest, RegisterRequest, RefreshTokenRequest } from '../types/auth.types';

export const authApi = {
  register: (data: RegisterRequest) =>
    axiosInstance.post<AuthResponse>('/auth/register', data).then(r => r.data),

  login: (data: LoginRequest) =>
    axiosInstance.post<AuthResponse>('/auth/login', data).then(r => r.data),

  refresh: (data: RefreshTokenRequest) =>
    axiosInstance.post<AuthResponse>('/auth/refresh', data).then(r => r.data),

  logout: (refreshToken: string) =>
    axiosInstance.post('/auth/logout', { refreshToken }),
};