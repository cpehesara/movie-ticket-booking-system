import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchMovies } from '../../../viewmodel/slices/movieSlice';
import { MovieResponse } from '../../../model/types/movie.types';
import { ShowtimeResponse } from '../../../model/types/showtime.types';
import { Header } from '../../components/layout';
import { Loading } from '../../components/common/Loading';
import { showtimeApi } from '../../../model/api/showtimeApi';

type QuickBookState = {
  movieId: string;
  date: string;
  cinema: string;
  time: string;
};

const FALLBACK_DESCRIPTION = 'Description';

const MovieVisual: React.FC<{ posterUrl?: string | null; title: string; compact?: boolean }> = ({
  posterUrl,
  title,
  compact = false,
}) => (
  <div
    className={`overflow-hidden rounded-[1.5rem] ${compact ? 'h-40' : 'h-52 md:h-64'} flex items-center justify-center`}
    style={{
      background: 'linear-gradient(160deg, #111827, #0b1220)',
      border: '1px solid #1f2937',
    }}
  >
    {posterUrl ? (
      <img src={posterUrl} alt={title} className="w-full h-full object-cover" />
    ) : (
      <div
        className="rounded-[1.1rem] flex items-center justify-center"
        style={{
          width: compact ? '5rem' : '6rem',
          height: compact ? '5rem' : '6rem',
          border: '2px solid #4b5563',
          color: '#6b7280',
          fontSize: compact ? '0.72rem' : '0.82rem',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
        }}
      >
        Image
      </div>
    )}
  </div>
);

const MovieGridCard: React.FC<{ movie: MovieResponse; onBook: () => void }> = ({ movie, onBook }) => (
  <article>
    <MovieVisual posterUrl={movie.posterUrl} title={movie.title} compact />
    <div className="pt-3 text-center">
      <h3 className="text-sm font-semibold text-white">{movie.title}</h3>
      <p className="mt-1 text-xs" style={{ color: '#9ca3af' }}>{movie.language}</p>
      <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>{movie.genre}</p>
      <button
        type="button"
        onClick={onBook}
        className="mt-3 rounded-xl px-4 py-2 text-xs font-semibold transition-all"
        style={{
          backgroundColor: '#111827',
          color: '#f3f4f6',
          border: '1px solid #1f2937',
        }}
      >
        View Showtimes
      </button>
    </div>
  </article>
);

export const MovieListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { movies, loading } = useSelector((s: RootState) => s.movies);
  const navigate = useNavigate();

  const [showtimesByMovie, setShowtimesByMovie] = useState<Record<number, ShowtimeResponse[]>>({});
  const [quickBook, setQuickBook] = useState<QuickBookState>({
    movieId: '',
    date: '',
    cinema: '',
    time: '',
  });

  useEffect(() => {
    dispatch(fetchMovies(undefined));
  }, [dispatch]);

  useEffect(() => {
    if (movies.length === 0) return;

    let active = true;
    Promise.all(
      movies.map((movie) => showtimeApi.getByMovie(movie.id, true).catch(() => [] as ShowtimeResponse[]))
    ).then((results) => {
      if (!active) return;

      const next: Record<number, ShowtimeResponse[]> = {};
      movies.forEach((movie, index) => {
        next[movie.id] = results[index];
      });
      setShowtimesByMovie(next);
    });

    return () => {
      active = false;
    };
  }, [movies]);

  const activeMovies = useMemo(
    () => movies.filter((movie) => movie.isActive),
    [movies]
  );

  const featuredMovie = activeMovies[0] ?? movies[0] ?? null;

  const dateOptions = useMemo(() => {
    const dates = new Set<string>();
    Object.values(showtimesByMovie).flat().forEach((showtime) => {
      dates.add(new Date(showtime.startTime).toISOString().slice(0, 10));
    });
    return Array.from(dates).sort();
  }, [showtimesByMovie]);

  const cinemaOptions = useMemo(() => {
    const cinemas = new Set<string>();
    Object.values(showtimesByMovie).flat().forEach((showtime) => {
      if (showtime.cinemaName) cinemas.add(showtime.cinemaName);
    });
    return Array.from(cinemas).sort();
  }, [showtimesByMovie]);

  const timeOptions = useMemo(() => {
    const movieId = Number(quickBook.movieId);
    const pool = quickBook.movieId ? (showtimesByMovie[movieId] ?? []) : Object.values(showtimesByMovie).flat();

    return pool
      .filter((showtime) => {
        const showDate = new Date(showtime.startTime).toISOString().slice(0, 10);
        return (!quickBook.date || showDate === quickBook.date)
          && (!quickBook.cinema || showtime.cinemaName === quickBook.cinema);
      })
      .map((showtime) => new Date(showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      .filter((value, index, all) => all.indexOf(value) === index);
  }, [quickBook.cinema, quickBook.date, quickBook.movieId, showtimesByMovie]);

  const handleQuickBook = () => {
    const movieId = Number(quickBook.movieId);
    const pool = quickBook.movieId ? (showtimesByMovie[movieId] ?? []) : Object.values(showtimesByMovie).flat();

    const match = pool.find((showtime) => {
      const showDate = new Date(showtime.startTime).toISOString().slice(0, 10);
      const showTime = new Date(showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return (!quickBook.date || showDate === quickBook.date)
        && (!quickBook.cinema || showtime.cinemaName === quickBook.cinema)
        && (!quickBook.time || showTime === quickBook.time);
    });

    if (match) {
      navigate(`/booking/${match.id}`);
      return;
    }

    navigate('/movies');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:px-5 md:py-8">
        {loading ? (
          <Loading />
        ) : (
          <>
            <section
              className="rounded-[2rem] p-6 md:p-8 grid gap-8 md:grid-cols-[1.3fr_0.65fr]"
              style={{
                background: 'linear-gradient(145deg, #0d1117, #111827)',
                border: '1px solid #1f2937',
                boxShadow: '0 18px 40px rgba(0,0,0,0.22)',
              }}
            >
              <div className="flex flex-col justify-center">
                <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: '#f87171' }}>
                  New Release
                </p>
                <h1 className="mt-3 text-3xl md:text-4xl font-bold text-white">
                  {featuredMovie?.title ?? 'Movie Name'}
                </h1>
                <p className="mt-4 max-w-2xl text-sm md:text-base leading-7" style={{ color: '#9ca3af' }}>
                  {featuredMovie?.description || FALLBACK_DESCRIPTION}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href={featuredMovie?.trailerUrl || '#'}
                    target={featuredMovie?.trailerUrl ? '_blank' : undefined}
                    rel={featuredMovie?.trailerUrl ? 'noreferrer' : undefined}
                    className="rounded-xl px-5 py-3 text-sm font-semibold"
                    style={{
                      backgroundColor: '#111827',
                      color: '#fff',
                      border: '1px solid #1f2937',
                      pointerEvents: featuredMovie?.trailerUrl ? 'auto' : 'none',
                      opacity: featuredMovie?.trailerUrl ? 1 : 0.7,
                      textDecoration: 'none',
                    }}
                  >
                    Watch Trailer
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      if (featuredMovie) navigate(`/movies/${featuredMovie.id}/showtimes`);
                    }}
                    className="rounded-xl px-5 py-3 text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: '#dc2626',
                      color: '#fff',
                      boxShadow: '0 10px 22px rgba(220,38,38,0.18)',
                      opacity: featuredMovie ? 1 : 0.8,
                    }}
                  >
                    Book Now
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="w-full max-w-[18rem]">
                  <MovieVisual posterUrl={featuredMovie?.posterUrl} title={featuredMovie?.title ?? 'Movie Name'} />
                </div>
              </div>
            </section>

            <section
              className="mt-6 rounded-[1.5rem] p-4 md:p-5"
              style={{
                backgroundColor: '#0d1117',
                border: '1px solid #1f2937',
                boxShadow: '0 12px 26px rgba(0,0,0,0.18)',
              }}
            >
              <div className="grid gap-3 md:grid-cols-[160px_repeat(4,minmax(0,1fr))_130px] md:items-center">
                <div className="text-sm font-semibold text-white">Quick Book</div>

                <select
                  value={quickBook.movieId}
                  onChange={(e) => setQuickBook((prev) => ({ ...prev, movieId: e.target.value, time: '' }))}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ backgroundColor: '#111827', border: '1px solid #1f2937', color: '#f3f4f6' }}
                >
                  <option value="">Movie Name</option>
                  {activeMovies.map((movie) => (
                    <option key={movie.id} value={movie.id}>{movie.title}</option>
                  ))}
                </select>

                <select
                  value={quickBook.date}
                  onChange={(e) => setQuickBook((prev) => ({ ...prev, date: e.target.value, time: '' }))}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ backgroundColor: '#111827', border: '1px solid #1f2937', color: '#f3f4f6' }}
                >
                  <option value="">Select Date</option>
                  {dateOptions.map((date) => (
                    <option key={date} value={date}>
                      {new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </option>
                  ))}
                </select>

                <select
                  value={quickBook.cinema}
                  onChange={(e) => setQuickBook((prev) => ({ ...prev, cinema: e.target.value, time: '' }))}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ backgroundColor: '#111827', border: '1px solid #1f2937', color: '#f3f4f6' }}
                >
                  <option value="">Select Cinema</option>
                  {cinemaOptions.map((cinema) => (
                    <option key={cinema} value={cinema}>{cinema}</option>
                  ))}
                </select>

                <select
                  value={quickBook.time}
                  onChange={(e) => setQuickBook((prev) => ({ ...prev, time: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ backgroundColor: '#111827', border: '1px solid #1f2937', color: '#f3f4f6' }}
                >
                  <option value="">Select Timing</option>
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleQuickBook}
                  className="rounded-xl px-4 py-3 text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    boxShadow: '0 10px 20px rgba(220,38,38,0.18)',
                  }}
                >
                  Book Now
                </button>
              </div>
            </section>

            <section className="mt-8">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-white">Now Showing</h2>
                <Link to="/cinemas" className="text-sm font-semibold" style={{ color: '#f87171', textDecoration: 'none' }}>
                  Browse Cinemas
                </Link>
              </div>

              {activeMovies.length === 0 ? (
                <div
                  className="rounded-2xl p-12 text-center"
                  style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
                >
                  <p style={{ color: '#6b7280' }}>No movies available right now.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-6">
                  {activeMovies.map((movie) => (
                    <MovieGridCard
                      key={movie.id}
                      movie={movie}
                      onBook={() => {
                        navigate(`/movies/${movie.id}/showtimes`);
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer
        className="mt-auto"
        style={{ borderTop: '1px solid #111827', backgroundColor: '#080b10' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-10 md:px-5 grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-white font-semibold mb-3">About CineMax</h3>
            <p className="text-sm leading-7" style={{ color: '#9ca3af' }}>
              Description
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Quick Links</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/movies" style={{ color: '#9ca3af', textDecoration: 'none' }}>Movies</Link>
              <Link to="/cinemas" style={{ color: '#9ca3af', textDecoration: 'none' }}>Cinemas</Link>
              <Link to="/experience" style={{ color: '#9ca3af', textDecoration: 'none' }}>Experience</Link>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Help</h3>
            <div className="flex flex-col gap-2 text-sm" style={{ color: '#9ca3af' }}>
              <span>FAQs</span>
              <span>Contact Us</span>
              <span>Terms and Conditions</span>
              <span>Privacy Policy</span>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Follow Us</h3>
            <div className="flex items-center gap-3">
              {['f', 'i', '▶', '✉'].map((label) => (
                <span
                  key={label}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{ backgroundColor: '#111827', color: '#f3f4f6', border: '1px solid #1f2937' }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
