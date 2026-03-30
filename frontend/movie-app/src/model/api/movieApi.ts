import axiosInstance from '../services/axiosInstance';
import { MovieResponse, MovieFilters } from '../types/movie.types';

export const movieApi = {
  getAll: (filters?: MovieFilters) =>
    axiosInstance.get<MovieResponse[]>('/movies', { params: filters }).then(r => r.data),

  getById: (id: number) =>
    axiosInstance.get<MovieResponse>(`/movies/${id}`).then(r => r.data),
};