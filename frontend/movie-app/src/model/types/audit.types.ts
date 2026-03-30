export interface AuditLogResponse {
  id: number;
  seatId: number | null;
  showtimeId: number | null;
  bookingId: number | null;
  actorId: number | null;
  actorType: 'USER' | 'KIOSK' | 'SYSTEM';
  action: string;
  fromState: string | null;
  toState: string | null;
  notes: string | null;
  createdAt: string;
}