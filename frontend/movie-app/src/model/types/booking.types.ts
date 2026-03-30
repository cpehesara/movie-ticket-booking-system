export interface BookedSeatInfo {
  seatId: number;
  rowLabel: string;
  colNumber: number;
  seatType: string;
  seatState: string;
  ledIndex: number | null;
}

export interface BookingResponse {
  id: number;
  bookingCode: string;
  status: BookingStatus;
  totalAmount: number;
  bookedAt: string;
  expiresAt: string | null;
  checkedInAt: string | null;
  paymentStatus: string | null;
  showtimeId: number;
  movieTitle: string;
  screenName: string;
  cinemaName: string;
  startTime: string;
  seats: BookedSeatInfo[];
  qrCodeBase64: string | null;
}

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface CreateBookingRequest {
  showtimeId: number;
  seatIds: number[];
  paymentMethod?: string;
}