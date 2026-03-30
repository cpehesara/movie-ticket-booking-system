import axiosInstance from '../services/axiosInstance';
import { ShowtimeResponse } from '../types/showtime.types';

export const showtimeApi = {
  getByMovie: (movieId: number, upcomingOnly = false) =>
    axiosInstance
      .get<ShowtimeResponse[]>('/showtimes', { params: { movieId, upcomingOnly } })
      .then(r => r.data),

  getById: (id: number) =>
    axiosInstance.get<ShowtimeResponse>(`/showtimes/${id}`).then(r => r.data),
};