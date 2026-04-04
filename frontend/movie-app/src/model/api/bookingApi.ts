import axiosInstance from '../services/axiosInstance';
import { BookingResponse, CreateBookingRequest } from '../types/booking.types';

export const bookingApi = {
  create: (data: CreateBookingRequest) =>
    axiosInstance.post<BookingResponse>('/bookings', data).then(r => r.data),

  getMyBookings: () =>
    axiosInstance.get<BookingResponse[]>('/bookings/me').then(r => r.data),

  /**
   * Fetch a single booking by ID.
   * The backend's GET /api/bookings/{id} calls bookingMapper.toResponse()
   * which does NOT include the QR code by default.
   *
   * To return the QR, the BookingController.getBookingById() method needs
   * to be updated to call toResponseWithQr() when the booking status is
   * CONFIRMED or CHECKED_IN. Until then, the QR will be null here.
   *
   * Used by: BookingHistoryPage "Show QR" button
   */
  getById: (id: number) =>
    axiosInstance.get<BookingResponse>(`/bookings/${id}`).then(r => r.data),

  cancel: (id: number) =>
    axiosInstance.post<BookingResponse>(`/bookings/${id}/cancel`).then(r => r.data),
};