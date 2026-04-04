import axiosInstance from '../services/axiosInstance';

export interface SeatArrivalResult {
  success: boolean;
  message: string;
  seatLabel?: string;
  movieTitle?: string;
  startTime?: string;
  seatedAt?: string;
}

export const seatArrivalApi = {
  /**
   * Customer scans the permanent QR sticker on their physical seat.
   * Sends the raw decoded QR text (SEAT:{id} or full HMAC format) to the backend.
   * Backend validates ownership and transitions seat GUIDING → OCCUPIED, LED → OFF.
   *
   * POST /api/seat-arrival/scan
   * Body: { qrPayload: "SEAT:3:1:A:3:hmac..." }
   * Auth: Bearer JWT (customer must be logged in)
   */
  confirm: (qrPayload: string) =>
    axiosInstance
      .post<SeatArrivalResult>('/seat-arrival/scan', { qrPayload })
      .then(r => r.data),
};
