import axiosInstance from '../services/axiosInstance';
import { SeatMapResponse } from '../types/seat.types';

export const seatApi = {
  getSeatMap: (showtimeId: number) =>
    axiosInstance.get<SeatMapResponse>(`/seats/${showtimeId}`).then(r => r.data),
};