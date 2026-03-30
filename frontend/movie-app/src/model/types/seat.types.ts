export type SeatState =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'BOOKED'
  | 'OCCUPIED'
  | 'CANCELLED'
  | 'MAINTENANCE';

export type SeatType = 'STANDARD' | 'VIP' | 'COUPLE' | 'WHEELCHAIR';

export interface SeatInfo {
  seatId: number;
  rowLabel: string;
  colNumber: number;
  seatType: SeatType;
  seatState: SeatState;
  isActive: boolean;
  ledIndex: number | null;
}

export interface SeatMapResponse {
  showtimeId: number;
  screenId: number;
  screenName: string;
  rowsCount: number;
  colsCount: number;
  totalSeats: number;
  availableCount: number;
  seats: SeatInfo[];
}

export interface SeatWebSocketUpdate {
  seatId: number;
  showtimeId: number;
  rowLabel: string;
  colNumber: number;
  seatState: SeatState;
  timestamp: number;
}