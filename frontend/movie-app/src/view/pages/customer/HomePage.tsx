import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchMovies } from '../../../viewmodel/slices/movieSlice';
import { MovieResponse } from '../../../model/types/movie.types';
import { Loading } from '../../components/common/Loading';
import { Header } from '../../components/layout';

const FALLBACK_DESCRIPTION =
  'Experience the latest releases, reserve your seats in minutes, and enjoy a smoother cinema night with CinePlex.';

const PLACEHOLDER_NOW_SHOWING = Array.from({ length: 6 }, (_, index) => ({
  id: `now-${index}`,
}));

const PLACEHOLDER_COMING_SOON = Array.from({ length: 6 }, (_, index) => ({
  id: `soon-${index}`,
}));

const formatReleaseDate = (value: string) =>
  new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

const MovieRailCard: React.FC<{
  movie: MovieResponse;
  actionLabel: string;
  onClick: () => void;
}> = ({ movie, actionLabel, onClick }) => (
  <article
    className="rounded-3xl overflow-hidden flex flex-col min-h-[20rem]"
    style={{
      backgroundColor: '#0d1117',
      border: '1px solid #1f2937',
      boxShadow: '0 12px 28px rgba(0, 0, 0, 0.18)',
    }}
  >
    <div
      className="relative"
      style={{ aspectRatio: '4 / 5', background: 'linear-gradient(160deg, #111827, #0f172a)' }}
    >
      {movie.posterUrl ? (
        <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-5xl" style={{ color: '#374151' }}>
          ▶
        </div>
      )}
      <div
        className="absolute inset-x-0 bottom-0 p-4"
        style={{ background: 'linear-gradient(180deg, rgba(8,11,16,0), rgba(8,11,16,0.94))' }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#f87171' }}>
          {movie.genre}
        </p>
      </div>
    </div>

    <div className="p-4 flex flex-col gap-3 flex-1">
      <div>
        <h3 className="text-white font-semibold text-base leading-tight">{movie.title}</h3>
        <p className="mt-1 text-sm" style={{ color: '#9ca3af' }}>
          {movie.durationMins} min · {movie.language}
        </p>
      </div>

      <p className="text-sm leading-6 line-clamp-3" style={{ color: '#6b7280' }}>
        {movie.description || FALLBACK_DESCRIPTION}
      </p>

      <button
        onClick={onClick}
        className="mt-auto self-start px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{
          backgroundColor: '#dc2626',
          color: '#fff',
          boxShadow: '0 10px 20px rgba(220,38,38,0.18)',
        }}
      >
        {actionLabel}
      </button>
    </div>
  </article>
);

const PlaceholderMovieCard: React.FC<{ actionLabel: string }> = ({ actionLabel }) => (
  <article
    className="rounded-3xl overflow-hidden flex flex-col min-h-[20rem]"
    style={{
      backgroundColor: '#0d1117',
      border: '1px solid #1f2937',
      boxShadow: '0 12px 28px rgba(0, 0, 0, 0.18)',
    }}
  >
    <div
      className="relative"
      style={{ aspectRatio: '4 / 5', background: 'linear-gradient(160deg, #111827, #0f172a)' }}
    >
      <div className="w-full h-full flex items-center justify-center text-5xl" style={{ color: '#374151' }}>
        ▶
      </div>
      <div
        className="absolute inset-x-0 bottom-0 p-4"
        style={{ background: 'linear-gradient(180deg, rgba(8,11,16,0), rgba(8,11,16,0.94))' }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#f87171' }}>
          Genre
        </p>
      </div>
    </div>

    <div className="p-4 flex flex-col gap-3 flex-1">
      <div>
        <h3 className="text-white font-semibold text-base leading-tight">Movie Name</h3>
        <p className="mt-1 text-sm" style={{ color: '#9ca3af' }}>
          120 min · English
        </p>
      </div>

      <p className="text-sm leading-6 line-clamp-3" style={{ color: '#6b7280' }}>
        Description
      </p>

      <button
        disabled
        className="mt-auto self-start px-4 py-2 rounded-xl text-sm font-semibold"
        style={{
          backgroundColor: '#dc2626',
          color: '#fff',
          boxShadow: '0 10px 20px rgba(220,38,38,0.18)',
          opacity: 0.8,
        }}
      >
        {actionLabel}
      </button>
    </div>
  </article>
);

const HomeMovieCard: React.FC<{
  movie: MovieResponse;
  actionLabel: string;
  onClick: () => void;
}> = ({ movie, actionLabel, onClick }) => (
  <article
    className="rounded-3xl overflow-hidden flex flex-col min-h-[20rem]"
    style={{
      backgroundColor: '#0d1117',
      border: '1px solid #1f2937',
      boxShadow: '0 12px 28px rgba(0, 0, 0, 0.18)',
    }}
  >
    <div
      className="relative"
      style={{ aspectRatio: '4 / 5', background: 'linear-gradient(160deg, #111827, #0f172a)' }}
    >
      {movie.posterUrl ? (
        <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-5xl" style={{ color: '#374151' }}>
          ▶
        </div>
      )}
      <div
        className="absolute inset-x-0 bottom-0 p-4"
        style={{ background: 'linear-gradient(180deg, rgba(8,11,16,0), rgba(8,11,16,0.94))' }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#f87171' }}>
          {movie.genre}
        </p>
      </div>
    </div>

    <div className="p-4 flex flex-col gap-3 flex-1">
      <div>
        <h3 className="text-white font-semibold text-base leading-tight">{movie.title}</h3>
        <p className="mt-1 text-sm" style={{ color: '#9ca3af' }}>
          {movie.durationMins} min · {movie.language}
        </p>
      </div>

      <p className="text-sm leading-6 line-clamp-3" style={{ color: '#6b7280' }}>
        {movie.description || FALLBACK_DESCRIPTION}
      </p>

      <button
        onClick={onClick}
        className="mt-auto self-start px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{
          backgroundColor: '#dc2626',
          color: '#fff',
          boxShadow: '0 10px 20px rgba(220,38,38,0.18)',
        }}
      >
        {actionLabel}
      </button>
    </div>
  </article>
);

export const HomePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { movies, loading } = useSelector((s: RootState) => s.movies);

  useEffect(() => {
    dispatch(fetchMovies(undefined));
  }, [dispatch]);

  const { featuredMovie, nowShowing, comingSoon } = useMemo(() => {
    const today = new Date();
    const activeMovies = movies.filter((movie) => movie.isActive);
    const featured = activeMovies[0] ?? null;

    const released = activeMovies.filter((movie) => new Date(movie.releaseDate) <= today).slice(0, 6);
    const upcoming = activeMovies.filter((movie) => new Date(movie.releaseDate) > today).slice(0, 6);

    return {
      featuredMovie: featured,
      nowShowing: released,
      comingSoon: upcoming,
    };
  }, [movies]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:px-5 md:py-8">
        {loading ? (
          <Loading />
        ) : (
          <>
            <section
              className="rounded-[2rem] p-6 md:p-10 grid gap-8 md:grid-cols-[1.5fr_0.9fr]"
              style={{
                background: 'linear-gradient(135deg, #0d1117, #111827)',
                border: '1px solid #1f2937',
                boxShadow: '0 18px 40px rgba(0,0,0,0.22)',
              }}
            >
              <div className="flex flex-col justify-center">
                <p className="text-xs uppercase tracking-[0.32em] font-semibold" style={{ color: '#f87171' }}>
                  Featured Tonight
                </p>
                <h1 className="mt-4 text-3xl md:text-5xl font-bold text-white leading-tight">
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
                    className="px-5 py-3 rounded-xl text-sm font-semibold"
                    style={{
                      backgroundColor: '#111827',
                      color: '#fff',
                      border: '1px solid #1f2937',
                      pointerEvents: featuredMovie?.trailerUrl ? 'auto' : 'none',
                      opacity: featuredMovie?.trailerUrl ? 1 : 0.7,
                    }}
                  >
                    Watch Trailer
                  </a>
                  <Link
                    to={featuredMovie ? `/movies/${featuredMovie.id}/showtimes` : '/movies'}
                    className="px-5 py-3 rounded-xl text-sm font-semibold"
                    style={{
                      backgroundColor: '#dc2626',
                      color: '#fff',
                      textDecoration: 'none',
                      boxShadow: '0 10px 22px rgba(220,38,38,0.18)',
                    }}
                  >
                    Book Now
                  </Link>
                </div>
              </div>

              <div
                className="rounded-[1.75rem] overflow-hidden min-h-[18rem] md:min-h-[22rem] flex items-center justify-center"
                style={{
                  background: 'linear-gradient(160deg, #111827, #0b1220)',
                  border: '1px solid #1f2937',
                }}
              >
                {featuredMovie?.posterUrl ? (
                  <img
                    src={featuredMovie.posterUrl}
                    alt={featuredMovie.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center px-6" style={{ color: '#374151' }}>
                    <div className="text-7xl mb-4">◫</div>
                    <p className="text-sm uppercase tracking-[0.3em]">Poster Preview</p>
                  </div>
                )}
              </div>
            </section>

            <section className="mt-10">
              <div className="flex items-center justify-between gap-4 mb-5">
                <h2 className="text-2xl font-bold text-white">Now Showing</h2>
                <Link to="/movies" className="text-sm font-semibold" style={{ color: '#f87171', textDecoration: 'none' }}>
                  View All
                </Link>
              </div>

              {nowShowing.length === 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {PLACEHOLDER_NOW_SHOWING.map((item) => (
                    <PlaceholderMovieCard key={item.id} actionLabel="Book Now" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {nowShowing.map((movie) => (
                    <HomeMovieCard
                      key={movie.id}
                      movie={movie}
                      actionLabel="Book Now"
                      onClick={() => navigate(`/movies/${movie.id}/showtimes`)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="mt-12">
              <div className="flex items-center justify-between gap-4 mb-5">
                <h2 className="text-2xl font-bold text-white">Coming Soon</h2>
                <Link to="/movies" className="text-sm font-semibold" style={{ color: '#f87171', textDecoration: 'none' }}>
                  View All
                </Link>
              </div>

              {comingSoon.length === 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {PLACEHOLDER_COMING_SOON.map((item) => (
                    <PlaceholderMovieCard key={item.id} actionLabel="See Movies" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {comingSoon.map((movie) => (
                    <MovieRailCard
                      key={movie.id}
                      movie={{
                        ...movie,
                        description: `Releases ${formatReleaseDate(movie.releaseDate)}.`,
                      }}
                      actionLabel="See Movies"
                      onClick={() => navigate('/movies')}
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
            <p className="text-sm leading-7" style={{ color: '#6b7280' }}>
              Book tickets faster, discover the latest releases, and manage your movie night from one place.
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
