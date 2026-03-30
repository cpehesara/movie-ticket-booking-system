import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchMovies } from '../../../viewmodel/slices/movieSlice';
import { MovieResponse } from '../../../model/types/movie.types';
import { ShowtimeResponse } from '../../../model/types/showtime.types';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Loading } from '../../components/common/Loading';
import { showtimeApi } from '../../../model/api/showtimeApi';

export const MovieListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { movies, loading } = useSelector((s: RootState) => s.movies);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showtimes, setShowtimes] = useState<Record<number, ShowtimeResponse[]>>({});

  useEffect(() => { dispatch(fetchMovies(undefined)); }, [dispatch]);

  const handleMovieClick = async (movieId: number) => {
    if (!showtimes[movieId]) {
      const data = await showtimeApi.getByMovie(movieId, true).catch(() => []);
      setShowtimes(prev => ({ ...prev, [movieId]: data }));
    }
  };

  const filtered = movies.filter((m: MovieResponse) =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    (m.genre?.toLowerCase() ?? '').includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Now Showing</h1>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search movies..."
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white
              text-sm w-64 focus:outline-none focus:border-red-500"
          />
        </div>

        {loading ? <Loading /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((movie: MovieResponse) => (
              <div key={movie.id}
                className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden
                  hover:border-red-600 transition-colors cursor-pointer group"
                onClick={() => handleMovieClick(movie.id)}>
                <div className="aspect-[2/3] bg-gray-800 relative">
                  {movie.posterUrl
                    ? <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>
                  }
                  <span className="absolute top-2 right-2 bg-black/70 text-yellow-400 text-xs
                    px-2 py-1 rounded">{movie.rating}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white text-sm truncate group-hover:text-red-400">
                    {movie.title}
                  </h3>
                  <p className="text-gray-500 text-xs mt-1">{movie.genre} · {movie.durationMins} min</p>
                  {movie.averageRating && (
                    <p className="text-yellow-400 text-xs mt-1">⭐ {movie.averageRating.toFixed(1)}</p>
                  )}
                  {showtimes[movie.id] && (
                    <div className="mt-3 flex flex-col gap-1">
                      {showtimes[movie.id].length === 0
                        ? <p className="text-gray-600 text-xs">No upcoming shows</p>
                        : showtimes[movie.id].map((st: ShowtimeResponse) => (
                            <button key={st.id}
                              onClick={e => { e.stopPropagation(); navigate(`/booking/${st.id}`); }}
                              className="w-full text-left text-xs bg-gray-800 hover:bg-red-900
                                px-3 py-2 rounded-lg text-gray-300 hover:text-white transition-colors">
                              <span className="font-medium">
                                {new Date(st.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-gray-500 ml-2">
                                {st.availableSeats} seats · LKR {st.basePrice}
                              </span>
                            </button>
                          ))
                      }
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};