import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchSeatMap, clearSeatMap } from '../../../viewmodel/slices/seatSlice';
import { createBooking, clearCurrent } from '../../../viewmodel/slices/bookingSlice';
import { useWebSocket } from '../../../viewmodel/hooks/useWebSocket';
import { useBookingTimer } from '../../../viewmodel/hooks/useBookingTimer';
import { useToast } from '../../components/common/Toast';
import { SeatGrid } from '../../components/seat-map/SeatGrid';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';
import { Header } from '../../components/layout';
import { Modal } from '../../components/common/Modal';
import { showtimeApi } from '../../../model/api/showtimeApi';
import { ShowtimeResponse } from '../../../model/types/showtime.types';
import { MovieResponse } from '../../../model/types/movie.types';
import { movieApi } from '../../../model/api/movieApi';
import { Link } from 'react-router-dom';

const formatMoney = (value: number) => `LKR ${value.toFixed(2)}`;

const formatDateLabel = (value: string) =>
  new Date(value).toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    weekday: 'long',
  });

const formatTimeLabel = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const MovieThumb: React.FC<{ posterUrl?: string | null; title: string }> = ({ posterUrl, title }) => (
  <div
    className="overflow-hidden rounded-[1.1rem] h-16 w-16 flex items-center justify-center"
    style={{
      background: 'linear-gradient(160deg, #111827, #0b1220)',
      border: '1px solid #1f2937',
    }}
  >
    {posterUrl ? (
      <img src={posterUrl} alt={title} className="w-full h-full object-cover" />
    ) : (
      <div
        className="rounded-[0.8rem] flex items-center justify-center"
        style={{
          width: '2.8rem',
          height: '2.8rem',
          border: '2px solid #4b5563',
          color: '#6b7280',
          fontSize: '0.5rem',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}
      >
        Img
      </div>
    )}
  </div>
);

export const BookingPage: React.FC = () => {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const id = Number(showtimeId);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { seatMap, selectedSeatIds, loading: seatLoading } = useSelector((s: RootState) => s.seats);
  const { current, loading: bookingLoading, error } = useSelector((s: RootState) => s.bookings);

  const [showtime, setShowtime] = useState<ShowtimeResponse | null>(null);
  const [relatedShowtimes, setRelatedShowtimes] = useState<ShowtimeResponse[]>([]);
  const [movie, setMovie] = useState<MovieResponse | null>(null);

  useWebSocket(id);
  const { display, expired, urgent } = useBookingTimer(current?.expiresAt ?? null);

  useEffect(() => {
    dispatch(fetchSeatMap(id));
    return () => {
      dispatch(clearSeatMap());
      dispatch(clearCurrent());
    };
  }, [id, dispatch]);

  useEffect(() => {
    let active = true;

    const loadShowtimeContext = async () => {
      try {
        const showtimeData = await showtimeApi.getById(id);
        if (!active) return;
        setShowtime(showtimeData);

        const [movieData, movieShowtimes] = await Promise.all([
          movieApi.getById(showtimeData.movieId).catch(() => null),
          showtimeApi.getByMovie(showtimeData.movieId, true).catch(() => [] as ShowtimeResponse[]),
        ]);

        if (!active) return;
        setMovie(movieData);
        setRelatedShowtimes(movieShowtimes);
      } catch {
        if (active) {
          setShowtime(null);
          setRelatedShowtimes([]);
        }
      }
    };

    if (!Number.isNaN(id)) {
      loadShowtimeContext();
    }

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (error) showToast(error, 'error');
  }, [error, showToast]);

  const handleBook = () => {
    dispatch(createBooking({ showtimeId: id, seatIds: selectedSeatIds, paymentMethod: 'CARD' }));
  };

  const selectedSeats = useMemo(
    () => (seatMap?.seats ?? []).filter((s) => selectedSeatIds.includes(s.seatId)),
    [seatMap?.seats, selectedSeatIds]
  );

  const seatLabels = selectedSeats.map((seat) => `${seat.rowLabel}${seat.colNumber}`);
  const totalAmount = selectedSeatIds.length * (showtime?.basePrice ?? 0);

  const sameDateShowtimes = useMemo(() => {
    if (!showtime) return [];
    const dateKey = new Date(showtime.startTime).toDateString();
    return relatedShowtimes.filter((item) => new Date(item.startTime).toDateString() === dateKey);
  }, [relatedShowtimes, showtime]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:px-5 md:py-8">
        {seatLoading ? (
          <Loading message="Loading seat map..." />
        ) : (
          <>
            <section
              className="rounded-[1.5rem] p-4 md:p-5"
              style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
            >
              <div className="flex flex-wrap gap-3">
                <div
                  className="rounded-xl px-4 py-3 min-w-[150px]"
                  style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}
                >
                  <div className="text-sm font-semibold text-white">
                    {showtime ? formatDateLabel(showtime.startTime) : 'Show Date'}
                  </div>
                </div>

                {sameDateShowtimes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(`/booking/${item.id}`)}
                    className="rounded-xl px-4 py-3 text-left transition-all min-w-[120px]"
                    style={{
                      backgroundColor: item.id === id ? 'rgba(220,38,38,0.14)' : '#111827',
                      border: `1px solid ${item.id === id ? 'rgba(220,38,38,0.28)' : '#1f2937'}`,
                      color: '#f3f4f6',
                    }}
                  >
                    <div className="text-xs" style={{ color: '#9ca3af' }}>{movie?.language ?? 'English'}</div>
                    <div className="mt-1 text-sm font-semibold">{formatTimeLabel(item.startTime)}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div
                className="rounded-[1.75rem] p-5 md:p-6"
                style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
              >
                <div className="flex justify-center mb-5">
                  <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm" style={{ color: '#9ca3af' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded border inline-block" style={{ borderColor: '#9ca3af' }} />
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded inline-block" style={{ backgroundColor: '#facc15' }} />
                      <span>Selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded inline-block" style={{ backgroundColor: '#6b7280' }} />
                      <span>Occupied</span>
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-[1.5rem] p-5 md:p-6 overflow-x-auto"
                  style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}
                >
                  <SeatGrid />
                </div>

                {current && !expired && (
                  <div
                    className="mt-5 rounded-xl px-5 py-4"
                    style={{
                      backgroundColor: urgent ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.08)',
                      border: `1px solid ${urgent ? 'rgba(239,68,68,0.25)' : 'rgba(234,179,8,0.2)'}`,
                    }}
                  >
                    <p style={{ color: '#9ca3af', fontSize: '0.78rem' }}>Reservation expires in</p>
                    <p
                      className="mt-1 font-mono font-bold text-2xl"
                      style={{ color: urgent ? '#f87171' : '#facc15' }}
                    >
                      {display}
                    </p>
                  </div>
                )}
              </div>

              <aside
                className="rounded-[1.75rem] p-5 md:p-6 h-fit"
                style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
              >
                <h2 className="text-2xl font-bold text-white">Booking Summary</h2>

                <div
                  className="mt-5 rounded-[1.25rem] p-4"
                  style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}
                >
                  <div className="flex items-start gap-3">
                    <MovieThumb posterUrl={movie?.posterUrl} title={showtime?.movieTitle ?? 'Movie'} />
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-white">{showtime?.movieTitle ?? 'Movie'}</h3>
                      <p className="mt-1 text-sm" style={{ color: '#9ca3af' }}>
                        {movie?.genre ?? 'Movie'} {movie?.language ? `· ${movie.language}` : ''}
                      </p>
                      <p className="mt-2 text-xs" style={{ color: '#9ca3af' }}>
                        {showtime ? `${formatDateLabel(showtime.startTime)} · ${formatTimeLabel(showtime.startTime)}` : 'Showtime'}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>
                        {showtime?.cinemaName ?? seatMap?.screenName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-5" style={{ borderTop: '1px solid #1f2937' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6b7280' }}>
                    Seat Info
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {seatLabels.length > 0 ? (
                      seatLabels.map((label) => (
                        <span
                          key={label}
                          className="rounded-lg px-3 py-1.5 text-sm font-semibold"
                          style={{ backgroundColor: '#facc15', color: '#111827' }}
                        >
                          {label}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm" style={{ color: '#9ca3af' }}>Select seats</span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-5" style={{ borderTop: '1px solid #1f2937' }}>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: '#9ca3af' }}>Tickets</span>
                    <span className="font-semibold text-white">{selectedSeatIds.length} × {formatMoney(showtime?.basePrice ?? 0)}</span>
                  </div>
                </div>

                <div className="mt-5 pt-5" style={{ borderTop: '1px solid #1f2937' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6b7280' }}>
                    Payment Details
                  </p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span style={{ color: '#9ca3af' }}>Sub Total</span>
                    <span className="font-semibold text-white">{formatMoney(totalAmount)}</span>
                  </div>
                  <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid #1f2937' }}>
                    <span className="font-semibold text-white">Grand Total</span>
                    <span className="font-bold text-white">{formatMoney(totalAmount)}</span>
                  </div>
                </div>

                {!current && (
                  <Button onClick={handleBook} loading={bookingLoading} fullWidth>
                    Proceed
                  </Button>
                )}
              </aside>
            </section>
          </>
        )}
      </main>

      <Modal
        open={!!current && !expired}
        onClose={() => {}}
        title="Booking Confirmed"
      >
        <div className="flex flex-col items-center gap-5">
          {current?.qrCodeBase64 ? (
            <div
              className="p-3 rounded-2xl"
              style={{
                backgroundColor: '#fff',
                boxShadow: '0 0 0 1px #1f2937, 0 0 28px rgba(220,38,38,0.15)',
              }}
            >
              <img
                src={`data:image/png;base64,${current.qrCodeBase64}`}
                alt="Booking QR code"
                style={{ width: 192, height: 192, display: 'block' }}
              />
            </div>
          ) : (
            <div
              className="w-48 h-48 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
            >
              <span style={{ color: '#374151', fontSize: '0.8rem' }}>Generating QR...</span>
            </div>
          )}

          <div className="text-center">
            <p
              className="font-mono font-bold text-lg text-white tracking-widest"
              style={{ letterSpacing: '0.15em' }}
            >
              {current?.bookingCode}
            </p>
            <p style={{ color: '#4b5563', fontSize: '0.72rem', marginTop: '4px' }}>
              Seats: {current?.seats.map((s) => `${s.rowLabel}${s.colNumber}`).join(', ')}
            </p>
          </div>

          <div
            className="w-full rounded-lg px-4 py-3 text-center"
            style={{ backgroundColor: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.15)' }}
          >
            <p style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
              Scan this at the entrance kiosk. A copy has been sent to your email.
            </p>
          </div>

          <Button onClick={() => navigate('/bookings')} variant="secondary" fullWidth>
            View All Bookings
          </Button>
        </div>
      </Modal>

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
