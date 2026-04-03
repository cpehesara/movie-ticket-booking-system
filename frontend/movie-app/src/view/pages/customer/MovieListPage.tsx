import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchMovies } from '../../../viewmodel/slices/movieSlice';
import { MovieResponse } from '../../../model/types/movie.types';
import { ShowtimeResponse } from '../../../model/types/showtime.types';
import { Footer, Header } from '../../components/layout';
import { Loading } from '../../components/common/Loading';
import { showtimeApi } from '../../../model/api/showtimeApi';

const GENRES = ['All', 'Action', 'Drama', 'Comedy', 'Thriller', 'Sci-Fi', 'Horror', 'Romance', 'Animation'];

export const MovieListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { movies, loading } = useSelector((s: RootState) => s.movies);
  const navigate = useNavigate();

  const [search, setSearch]       = useState('');
  const [genre, setGenre]         = useState('All');
  const [showtimes, setShowtimes] = useState<Record<number, ShowtimeResponse[]>>({});
  const [expanded, setExpanded]   = useState<number | null>(null);

  useEffect(() => { dispatch(fetchMovies(undefined)); }, [dispatch]);

  const handleMovieClick = async (movieId: number) => {
    const next = expanded === movieId ? null : movieId;
    setExpanded(next);
    if (next && !showtimes[next]) {
      const data = await showtimeApi.getByMovie(next, true).catch(() => []);
      setShowtimes(prev => ({ ...prev, [next]: data }));
    }
  };

  const filtered = movies.filter((m: MovieResponse) => {
    const q = search.toLowerCase();
    const matchSearch = m.title.toLowerCase().includes(q) || (m.genre?.toLowerCase() ?? '').includes(q);
    const matchGenre  = genre === 'All' || (m.genre?.toLowerCase() ?? '').includes(genre.toLowerCase());
    return matchSearch && matchGenre;
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Now Showing</h1>
          <p style={{ color: '#374151', fontSize: '0.8rem' }}>
            {movies.length} film{movies.length !== 1 ? 's' : ''} in cinemas
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          {/* Search */}
          <div
            className="flex items-center gap-2 rounded-xl px-4 flex-1 max-w-xs"
            style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
          >
            <span style={{ color: '#374151', fontSize: '0.85rem' }}>⌕</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search title or genre…"
              className="flex-1 bg-transparent py-2.5 text-sm text-white focus:outline-none"
              style={{ caretColor: '#dc2626' }}
            />
          </div>

          {/* Genre pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {GENRES.map(g => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: genre === g ? 'rgba(220,38,38,0.15)' : 'transparent',
                  color: genre === g ? '#f87171' : '#4b5563',
                  border: `1px solid ${genre === g ? 'rgba(220,38,38,0.25)' : 'transparent'}`,
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
          >
            <p style={{ color: '#374151' }}>No movies match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((movie: MovieResponse) => {
              const isExpanded = expanded === movie.id;
              const sts = showtimes[movie.id];

              return (
                <div
                  key={movie.id}
                  className="rounded-2xl overflow-hidden flex flex-col cursor-pointer"
                  style={{
                    backgroundColor: '#0d1117',
                    border: `1px solid ${isExpanded ? 'rgba(220,38,38,0.35)' : '#1f2937'}`,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxShadow: isExpanded ? '0 0 24px rgba(220,38,38,0.06)' : 'none',
                  }}
                  onMouseEnter={e => {
                    if (!isExpanded) e.currentTarget.style.borderColor = '#374151';
                  }}
                  onMouseLeave={e => {
                    if (!isExpanded) e.currentTarget.style.borderColor = '#1f2937';
                  }}
                  onClick={() => handleMovieClick(movie.id)}
                >
                  {/* Poster */}
                  <div
                    className="relative overflow-hidden"
                    style={{ aspectRatio: '2/3', backgroundColor: '#111827' }}
                  >
                    {movie.posterUrl ? (
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                        style={{ transition: 'transform 0.3s ease' }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: '#1f2937', fontSize: '2.5rem' }}>
                        ▶
                      </div>
                    )}

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {movie.rating && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-bold"
                          style={{ backgroundColor: 'rgba(0,0,0,0.75)', color: '#facc15', backdropFilter: 'blur(4px)' }}
                        >
                          {movie.rating}
                        </span>
                      )}
                      {movie.averageRating && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5"
                          style={{ backgroundColor: 'rgba(0,0,0,0.75)', color: '#fbbf24', backdropFilter: 'blur(4px)' }}
                        >
                          ★ {movie.averageRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3
                      className="font-semibold text-white text-sm leading-snug mb-1"
                      style={{ transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#fff')}
                    >
                      {movie.title}
                    </h3>
                    <p style={{ color: '#374151', fontSize: '0.7rem' }}>
                      {movie.genre} · {movie.durationMins} min · {movie.language}
                    </p>

                    {/* Showtimes */}
                    {isExpanded && (
                      <div className="mt-3 flex flex-col gap-1.5" onClick={e => e.stopPropagation()}>
                        {!sts ? (
                          <p style={{ color: '#374151', fontSize: '0.72rem' }}>Loading…</p>
                        ) : sts.length === 0 ? (
                          <p style={{ color: '#374151', fontSize: '0.72rem' }}>No upcoming shows</p>
                        ) : (
                          sts.map((st: ShowtimeResponse) => (
                            <button
                              key={st.id}
                              onClick={() => navigate(`/booking/${st.id}`)}
                              className="w-full text-left rounded-xl px-3 py-2.5 transition-all"
                              style={{
                                backgroundColor: '#111827',
                                border: '1px solid #1f2937',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.backgroundColor = 'rgba(220,38,38,0.1)';
                                e.currentTarget.style.borderColor = 'rgba(220,38,38,0.2)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor = '#111827';
                                e.currentTarget.style.borderColor = '#1f2937';
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-white text-xs font-semibold">
                                  {new Date(st.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span
                                  className="text-xs font-bold"
                                  style={{ color: '#4ade80' }}
                                >
                                  {st.availableSeats} left
                                </span>
                              </div>
                              <p style={{ color: '#4b5563', fontSize: '0.65rem', marginTop: '2px' }}>
                                LKR {st.basePrice}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
