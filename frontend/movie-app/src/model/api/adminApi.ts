import axiosInstance from '../services/axiosInstance';
import { BookingResponse } from '../types/booking.types';
import { UserResponse } from '../types/user.types';
import { MovieResponse } from '../types/movie.types';
import { ShowtimeResponse } from '../types/showtime.types';

export interface ScreenSummary {
  id: number;
  name: string;
  totalSeats: number;
  cinemaName: string;
}

export const adminApi = {
  // ── Movies ──
  createMovie: (data: Partial<MovieResponse>) =>
    axiosInstance.post<MovieResponse>('/admin/movies', data).then(r => r.data),

  updateMovie: (id: number, data: Partial<MovieResponse>) =>
    axiosInstance.put<MovieResponse>(`/admin/movies/${id}`, data).then(r => r.data),

  deleteMovie: (id: number) =>
    axiosInstance.delete(`/admin/movies/${id}`),

  // ── Showtimes ──
  createShowtime: (data: Partial<ShowtimeResponse>) =>
    axiosInstance.post<ShowtimeResponse>('/admin/showtimes', data).then(r => r.data),

  updateShowtime: (id: number, data: Partial<ShowtimeResponse>) =>
    axiosInstance.put<ShowtimeResponse>(`/admin/showtimes/${id}`, data).then(r => r.data),

  cancelShowtime: (id: number) =>
    axiosInstance.delete(`/admin/showtimes/${id}`),

  // ── Bookings ──
  getAllBookings: () =>
    axiosInstance.get<BookingResponse[]>('/admin/bookings').then(r => r.data),

  getBookingsByShowtime: (showtimeId: number) =>
    axiosInstance.get<BookingResponse[]>(`/admin/bookings/showtime/${showtimeId}`).then(r => r.data),

  // ── Live Tracking ──
  /**
   * Fetch initial snapshot of CHECKED_IN bookings for a showtime.
   * Used by LiveTrackingPage on mount before WebSocket events start arriving.
   */
  getTrackingSnapshot: (showtimeId: number) =>
    axiosInstance
      .get<BookingResponse[]>(`/admin/tracking/${showtimeId}/snapshot`)
      .then(r => r.data),

  // ── IoT LED Resync ──
  resyncLeds: (screenId: number, showtimeId: number) =>
    axiosInstance
      .post<{ screenId: number; synced: number; message: string }>(
        `/admin/screens/${screenId}/resync-leds`,
        null,
        { params: { showtimeId } }
      )
      .then(r => r.data),

  // ── Staff ──
  getAllStaff: () =>
    axiosInstance.get<UserResponse[]>('/admin/staff').then(r => r.data),

  registerStaff: (data: { email: string; password: string; fullName: string; phone?: string },
                  role: string, cinemaId: number) =>
    axiosInstance
      .post('/admin/staff', data, { params: { role, cinemaId } })
      .then(r => r.data),

  updateStaffRole: (userId: number, role: string) =>
    axiosInstance.put<UserResponse>(`/admin/staff/${userId}/role`, null, { params: { role } }).then(r => r.data),

  deactivateStaff: (userId: number) =>
    axiosInstance.delete(`/admin/staff/${userId}`),

  // ── Kiosks ──
  getAllKiosks: () =>
    axiosInstance.get<any[]>('/admin/kiosks').then(r => r.data),

  registerKiosk: (screenId: number, name?: string) =>
    axiosInstance
      .post('/admin/kiosks', null, { params: { screenId, name } })
      .then(r => r.data),

  // ── Seat State Override ──
  updateSeatState: (seatId: number, showtimeId: number, newState: string) =>
    axiosInstance
      .patch(`/admin/seats/${seatId}/state`, { showtimeId, newState })
      .then(r => r.data),

  // ── Screens ──
  getAllCinemas: () => axiosInstance.get<any[]>('/cinemas').then(r => r.data),
  getScreens: () =>
    axiosInstance.get<ScreenSummary[]>('/screens').then(r => r.data),
  getSeatsByScreen: (screenId: number) =>
    axiosInstance.get<any[]>(`/screens/${screenId}/seats`).then(r => r.data),
};