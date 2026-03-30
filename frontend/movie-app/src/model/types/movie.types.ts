export interface MovieResponse {
  id: number;
  title: string;
  description: string;
  durationMins: number;
  genre: string;
  language: string;
  rating: string;
  posterUrl: string | null;
  trailerUrl: string | null;
  releaseDate: string;
  averageRating: number | null;
  reviewCount: number;
  isActive: boolean;
}

export interface MovieFilters {
  genre?: string;
  language?: string;
  search?: string;
}