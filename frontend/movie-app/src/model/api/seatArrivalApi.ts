import axiosInstance from '../services/axiosInstance';
import { BookingResponse } from '../types/booking.types';

export const seatArrivalApi = {
  confirm: (bookingCode: string, seatId: number) =>
    axiosInstance
      .post<BookingResponse>('/seat-arrival', { bookingCode, seatId })
      .then(r => r.data),
};