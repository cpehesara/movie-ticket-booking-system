import axiosInstance from '../services/axiosInstance';
import { MovieResponse } from '../types/movie.types';
import { ShowtimeResponse } from '../types/showtime.types';
import { BookingResponse } from '../types/booking.types';
import { UserResponse } from '../types/user.types';

export const adminApi = {
  // Movies
  createMovie: (data: Partial<MovieResponse>) =>
    axiosInstance.post<MovieResponse>('/admin/movies', data).then(r => r.data),
  updateMovie: (id: number, data: Partial<MovieResponse>) =>
    axiosInstance.put<MovieResponse>(`/admin/movies/${id}`, data).then(r => r.data),
  deleteMovie: (id: number) =>
    axiosInstance.delete(`/admin/movies/${id}`),

  // Showtimes
  createShowtime: (data: Partial<ShowtimeResponse>) =>
    axiosInstance.post<ShowtimeResponse>('/admin/showtimes', data).then(r => r.data),
  updateShowtime: (id: number, data: Partial<ShowtimeResponse>) =>
    axiosInstance.put<ShowtimeResponse>(`/admin/showtimes/${id}`, data).then(r => r.data),
  cancelShowtime: (id: number) =>
    axiosInstance.delete(`/admin/showtimes/${id}`),

  // Bookings
  getAllBookings: () =>
    axiosInstance.get<BookingResponse[]>('/admin/bookings').then(r => r.data),
  getBookingsByShowtime: (showtimeId: number) =>
    axiosInstance.get<BookingResponse[]>(`/admin/bookings/showtime/${showtimeId}`).then(r => r.data),

  // Staff
  getAllStaff: () =>
    axiosInstance.get<UserResponse[]>('/admin/staff').then(r => r.data),
  deactivateStaff: (userId: number) =>
    axiosInstance.delete(`/admin/staff/${userId}`),

  // Kiosks
  registerKiosk: (screenId: number, name?: string) =>
    axiosInstance.post('/admin/kiosks', null, { params: { screenId, name } }).then(r => r.data),

  // Seat override
  updateSeatState: (seatId: number, showtimeId: number, newState: string) =>
    axiosInstance.patch(`/admin/seats/${seatId}/state`, { showtimeId, newState }),

  // LED resync
  resyncLeds: (screenId: number, showtimeId: number) =>
    axiosInstance.post(`/admin/screens/${screenId}/resync-leds`, null, { params: { showtimeId } }),
};