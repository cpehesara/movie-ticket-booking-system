import axiosInstance from '../services/axiosInstance';
import { BookingResponse, CreateBookingRequest } from '../types/booking.types';

export const bookingApi = {
  create: (data: CreateBookingRequest) =>
    axiosInstance.post<BookingResponse>('/bookings', data).then(r => r.data),

  getMyBookings: () =>
    axiosInstance.get<BookingResponse[]>('/bookings/me').then(r => r.data),

  getById: (id: number) =>
    axiosInstance.get<BookingResponse>(`/bookings/${id}`).then(r => r.data),

  cancel: (id: number) =>
    axiosInstance.post<BookingResponse>(`/bookings/${id}/cancel`).then(r => r.data),
};