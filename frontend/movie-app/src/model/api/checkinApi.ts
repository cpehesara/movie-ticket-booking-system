import axiosInstance from '../services/axiosInstance';
import { BookingResponse } from '../types/booking.types';

export const checkinApi = {
  checkin: (bookingCode: string) =>
    axiosInstance.post<BookingResponse>('/checkin', { bookingCode }).then(r => r.data),
};