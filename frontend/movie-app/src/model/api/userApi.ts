import axiosInstance from '../services/axiosInstance';
import { UserResponse, UpdateProfileRequest } from '../types/user.types';

export const userApi = {
  getMe: () =>
    axiosInstance.get<UserResponse>('/users/me').then(r => r.data),

  updateProfile: (data: UpdateProfileRequest) =>
    axiosInstance.put<UserResponse>('/users/me', data).then(r => r.data),
};