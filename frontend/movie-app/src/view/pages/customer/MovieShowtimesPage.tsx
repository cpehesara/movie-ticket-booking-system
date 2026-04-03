import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Footer, Header } from '../../components/layout';
import { Loading } from '../../components/common/Loading';
import { MovieResponse } from '../../../model/types/movie.types';
import { ShowtimeResponse } from '../../../model/types/showtime.types';
import { movieApi } from '../../../model/api/movieApi';
import { showtimeApi } from '../../../model/api/showtimeApi';

const formatDuration = (minutes: number) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs} hour ${mins} min`;
};

const formatFullDate = (value: string) =>
  new Date(value).toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString([], {
    month: 'short',
    day: '2-digit',
  });

const formatWeekday = (value: string) =>
  new Date(value).toLocaleDateString([], {
    weekday: 'short',
  });

const toDateKey = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const timeLabel = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

type DisplayShowtime = {
  id: string;
  cinemaName: string;
  language: string;
  label: string;
  bookingShowtimeId: number | null;
};

const MovieVisual: React.FC<{ posterUrl?: string | null; title: string }> = ({ posterUrl, title }) => (
  <div
    className="overflow-hidden rounded-[1.5rem] h-40 w-40 flex items-center justify-center"
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
          width: '5rem',
          height: '5rem',
          border: '2px solid #4b5563',
          color: '#6b7280',
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
        }}
      >
        Image
      </div>
    )}
  </div>
);

export const MovieShowtimesPage: React.FC = () => {
  const { movieId } = useParams<{ movieId: string }>();
  const id = Number(movieId);
  const navigate = useNavigate();

  const [movie, setMovie] = useState<MovieResponse | null>(null);
  const [showtimes, setShowtimes] = useState<ShowtimeResponse[]>([]);
  const [otherMovies, setOtherMovies] = useState<MovieResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const [movieData, movieShowtimes, movies] = await Promise.all([
          movieApi.getById(id),
          showtimeApi.getByMovie(id, true).catch(() => [] as ShowtimeResponse[]),
          movieApi.getAll().catch(() => [] as MovieResponse[]),
        ]);

        if (!active) return;

        setMovie(movieData);
        setShowtimes(movieShowtimes);
        setOtherMovies(movies.filter((item) => item.id !== id && item.isActive).slice(0, 12));

        const firstDate = movieShowtimes[0] ? toDateKey(movieShowtimes[0].startTime) : toDateKey(new Date());
        setSelectedDate(firstDate);
      } finally {
        if (active) setLoading(false);
      }
    };

    if (!Number.isNaN(id)) {
      load();
    }

    return () => {
      active = false;
    };
  }, [id]);

  const availableDates = useMemo(() => {
    const anchor = showtimes[0] ? new Date(showtimes[0].startTime) : new Date();
    return Array.from({ length: 10 }, (_, index) => {
      const next = new Date(anchor);
      next.setDate(anchor.getDate() + index);
      return toDateKey(next);
    });
  }, [showtimes]);

  const groupedShowtimes = useMemo(() => {
    const actualForDate = showtimes.filter((showtime) => toDateKey(showtime.startTime) === selectedDate);

    const sourcePool = actualForDate.length > 0 ? actualForDate : showtimes;
    const displayShowtimes = sourcePool.map<DisplayShowtime>((showtime) => {
      const actualMatch = actualForDate.find((candidate) =>
        candidate.cinemaName === showtime.cinemaName
        && timeLabel(candidate.startTime) === timeLabel(showtime.startTime)
      );

      return {
        id: `${selectedDate}-${showtime.id}`,
        cinemaName: showtime.cinemaName,
        language: movie?.language ?? 'English',
        label: timeLabel(showtime.startTime),
        bookingShowtimeId: actualMatch?.id ?? null,
      };
    });

    return displayShowtimes.reduce<Record<string, DisplayShowtime[]>>((acc, showtime) => {
      if (!acc[showtime.cinemaName]) acc[showtime.cinemaName] = [];
      acc[showtime.cinemaName].push(showtime);
      return acc;
    }, {});
  }, [movie?.language, selectedDate, showtimes]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
        <Header />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:px-5 md:py-8">
          <Loading />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:px-5 md:py-8">
        <section
          className="rounded-[2rem] p-6 md:p-8 grid gap-8 md:grid-cols-[190px_1fr]"
          style={{
            background: 'linear-gradient(145deg, #0d1117, #111827)',
            border: '1px solid #1f2937',
            boxShadow: '0 18px 40px rgba(0,0,0,0.22)',
          }}
        >
          <div className="flex items-start justify-center md:justify-start">
            <MovieVisual posterUrl={movie?.posterUrl} title={movie?.title ?? 'Movie'} />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-white">{movie?.title ?? 'Movie'}</h1>

            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm" style={{ color: '#9ca3af' }}>
              <span>{movie ? formatDuration(movie.durationMins) : '1 hour 45 min'}</span>
              <span>{showtimes[0] ? formatFullDate(showtimes[0].startTime) : 'Friday, 6th March, 2026'}</span>
              <span>{movie?.genre ?? 'Animation'}</span>
              <span>{movie?.language ?? 'English'}</span>
            </div>

            <p className="mt-5 text-sm leading-7" style={{ color: '#9ca3af' }}>
              {movie?.description ?? 'View details'}
            </p>

            <div className="mt-6">
              <a
                href={movie?.trailerUrl || '#'}
                target={movie?.trailerUrl ? '_blank' : undefined}
                rel={movie?.trailerUrl ? 'noreferrer' : undefined}
                className="rounded-xl px-5 py-3 text-sm font-semibold inline-block"
                style={{
                  backgroundColor: '#111827',
                  color: '#fff',
                  border: '1px solid #1f2937',
                  pointerEvents: movie?.trailerUrl ? 'auto' : 'none',
                  opacity: movie?.trailerUrl ? 1 : 0.7,
                  textDecoration: 'none',
                }}
              >
                Watch Trailer
              </a>
            </div>
          </div>
        </section>

        <section
          className="mt-5 rounded-[1.5rem] p-4 md:p-5"
          style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
        >
          <div className="flex flex-wrap gap-3">
            {availableDates.map((date) => (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
                className="min-w-[82px] rounded-xl px-4 py-3 text-center transition-all"
                style={{
                  backgroundColor: selectedDate === date ? 'rgba(220,38,38,0.14)' : '#111827',
                  border: `1px solid ${selectedDate === date ? 'rgba(220,38,38,0.28)' : '#1f2937'}`,
                  color: '#f3f4f6',
                }}
              >
                <div className="text-base font-semibold">{formatShortDate(date)}</div>
                <div className="mt-1 text-xs" style={{ color: '#9ca3af' }}>{formatWeekday(date)}</div>
              </button>
            ))}
          </div>
        </section>

        <section
          className="mt-4 rounded-[1.5rem] p-5 md:p-6"
          style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
        >
          {Object.keys(groupedShowtimes).length === 0 ? (
            <p style={{ color: '#6b7280' }}>No showtimes available.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {Object.entries(groupedShowtimes).map(([cinemaName, cinemaShowtimes]) => (
                <div key={cinemaName}>
                  <h2 className="text-xl font-semibold text-white">{cinemaName}</h2>
                  <div className="mt-4 flex flex-wrap gap-4">
                    {cinemaShowtimes.map((showtime) => (
                      <button
                        key={showtime.id}
                        type="button"
                        onClick={() => {
                          if (showtime.bookingShowtimeId) {
                            navigate(`/booking/${showtime.bookingShowtimeId}`);
                          }
                        }}
                        className="rounded-2xl px-5 py-4 text-left transition-all min-w-[140px]"
                        style={{
                          backgroundColor: '#111827',
                          border: '1px solid #1f2937',
                          color: '#f3f4f6',
                          opacity: showtime.bookingShowtimeId ? 1 : 0.68,
                          cursor: showtime.bookingShowtimeId ? 'pointer' : 'default',
                        }}
                      >
                        <div className="text-sm">{showtime.language}</div>
                        <div className="mt-2 text-base font-semibold">{showtime.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-white">Also Showing</h2>
            <Link to="/movies" className="text-sm font-semibold" style={{ color: '#f87171', textDecoration: 'none' }}>
              Back To Movies
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-6">
            {otherMovies.map((item) => (
              <article key={item.id}>
                <div
                  className="overflow-hidden rounded-[1.5rem] h-40 flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(160deg, #111827, #0b1220)',
                    border: '1px solid #1f2937',
                  }}
                >
                  {item.posterUrl ? (
                    <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="rounded-[1.1rem] flex items-center justify-center"
                      style={{
                        width: '4.8rem',
                        height: '4.8rem',
                        border: '2px solid #4b5563',
                        color: '#6b7280',
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.14em',
                      }}
                    >
                      Image
                    </div>
                  )}
                </div>
                <div className="pt-3 text-center">
                  <button
                    type="button"
                    onClick={() => navigate(`/movies/${item.id}/showtimes`)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: '#dc2626',
                      color: '#fff',
                      boxShadow: '0 10px 20px rgba(220,38,38,0.18)',
                    }}
                  >
                    Book
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
