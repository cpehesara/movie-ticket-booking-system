import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { movieApi } from '../../model/api/movieApi';
import { MovieResponse, MovieFilters } from '../../model/types/movie.types';

interface MovieState {
  movies: MovieResponse[];
  selected: MovieResponse | null;
  loading: boolean;
  error: string | null;
}

const initialState: MovieState = { movies: [], selected: null, loading: false, error: null };

// Fix: filters must not be optional when ThunkAPI follows — use undefined union instead
export const fetchMovies = createAsyncThunk(
  'movies/fetchAll',
  async (filters: MovieFilters | undefined, { rejectWithValue }) => {
    try { return await movieApi.getAll(filters); }
    catch (e: any) { return rejectWithValue(e.response?.data?.message || 'Failed to load movies'); }
  }
);

export const fetchMovieById = createAsyncThunk(
  'movies/fetchById',
  async (id: number, { rejectWithValue }) => {
    try { return await movieApi.getById(id); }
    catch (e: any) { return rejectWithValue(e.response?.data?.message || 'Movie not found'); }
  }
);

const movieSlice = createSlice({
  name: 'movies',
  initialState,
  reducers: {
    clearSelected: (state) => { state.selected = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMovies.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchMovies.fulfilled, (state, action) => {
        state.loading = false; state.movies = action.payload;
      })
      .addCase(fetchMovies.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      })
      .addCase(fetchMovieById.pending, (state) => { state.loading = true; })
      .addCase(fetchMovieById.fulfilled, (state, action) => {
        state.loading = false; state.selected = action.payload;
      })
      .addCase(fetchMovieById.rejected, (state, action) => {
        state.loading = false; state.error = action.payload as string;
      });
  },
});

export const { clearSelected } = movieSlice.actions;
export default movieSlice.reducer;