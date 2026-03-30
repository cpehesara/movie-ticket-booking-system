export interface ShowtimeResponse {
  id: number;
  movieId: number;
  movieTitle: string;
  screenId: number;
  screenName: string;
  cinemaName: string;
  startTime: string;
  endTime: string;
  basePrice: number;
  status: ShowtimeStatus;
  availableSeats: number;
  totalSeats: number;
}

export type ShowtimeStatus =
  | 'SCHEDULED'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';