import axiosInstance from '../services/axiosInstance';
import { BookingResponse } from '../types/booking.types';

export const checkinApi = {
  checkin: (qrPayload: string) =>
    axiosInstance.post<BookingResponse>('/checkin/scan', { qrPayload }, {
      headers: {
        'X-API-Key': 'KIOSK-HALL-A-2026-DEMO-KEY'
      }
    }).then(r => r.data),
};