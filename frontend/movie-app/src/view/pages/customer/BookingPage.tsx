import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchSeatMap, clearSeatMap } from '../../../viewmodel/slices/seatSlice';
import { createBooking, clearCurrent } from '../../../viewmodel/slices/bookingSlice';
import { useWebSocket } from '../../../viewmodel/hooks/useWebSocket';
import { useBookingTimer } from '../../../viewmodel/hooks/useBookingTimer';
import { useToast } from '../../components/common/Toast';
import { SeatGrid } from '../../components/seat-map/SeatGrid';
import { SeatLegend } from '../../components/seat-map/SeatLegend';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';
import { Header } from '../../components/layout/Header';
import { Modal } from '../../components/common/Modal';

export const BookingPage: React.FC = () => {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const id             = Number(showtimeId);
  const dispatch       = useDispatch<AppDispatch>();
  const navigate       = useNavigate();
  const { showToast }  = useToast();

  const { seatMap, selectedSeatIds, loading: seatLoading } =
    useSelector((s: RootState) => s.seats);
  const { current, loading: bookingLoading, error } =
    useSelector((s: RootState) => s.bookings);

  useWebSocket(id);
  const { display, expired, urgent } = useBookingTimer(current?.expiresAt ?? null);

  useEffect(() => {
    dispatch(fetchSeatMap(id));
    return () => { dispatch(clearSeatMap()); dispatch(clearCurrent()); };
  }, [id, dispatch]);

  useEffect(() => {
    if (error) showToast(error, 'error');
  }, [error, showToast]);

  const handleBook = () => {
    dispatch(createBooking({ showtimeId: id, seatIds: selectedSeatIds, paymentMethod: 'CARD' }));
  };

  // Compute per-seat pricing (base × type multiplier)
  const priceMultiplier: Record<string, number> = { STANDARD: 1, VIP: 1.5, COUPLE: 2, WHEELCHAIR: 1 };
  const basePrice  = 0; // displayed as estimated; real price from backend
  const selectedSeats = (seatMap?.seats ?? []).filter(s => selectedSeatIds.includes(s.seatId));
  const estimatedTotal = selectedSeats.reduce((sum, s) => {
    const price = (seatMap ? basePrice : 0) * (priceMultiplier[s.seatType] ?? 1);
    return sum + price;
  }, 0);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {seatLoading ? (
          <Loading message="Loading seat map…" />
        ) : (
          <>
            {/* Header row */}
            <div className="flex items-start justify-between mb-6 gap-4">
              <div>
                <h1 className="text-xl font-bold text-white">{seatMap?.screenName}</h1>
                <p style={{ color: '#4b5563', fontSize: '0.78rem', marginTop: '3px' }}>
                  {seatMap?.availableCount} of {seatMap?.totalSeats} seats available
                </p>
              </div>

              {/* Countdown timer (visible after booking is created) */}
              {current && !expired && (
                <div
                  className="text-center rounded-xl px-5 py-3"
                  style={{
                    backgroundColor: urgent
                      ? 'rgba(239,68,68,0.1)'
                      : 'rgba(234,179,8,0.08)',
                    border: `1px solid ${urgent ? 'rgba(239,68,68,0.25)' : 'rgba(234,179,8,0.2)'}`,
                  }}
                >
                  <p style={{ color: '#4b5563', fontSize: '0.65rem', marginBottom: '2px' }}>
                    Reservation expires in
                  </p>
                  <p
                    className="font-mono font-bold text-2xl"
                    style={{
                      color: urgent ? '#f87171' : '#facc15',
                      textShadow: urgent ? '0 0 12px rgba(239,68,68,0.4)' : 'none',
                    }}
                  >
                    {display}
                  </p>
                </div>
              )}
            </div>

            {/* Seat map */}
            <div
              className="rounded-2xl p-6 mb-5 overflow-x-auto"
              style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
            >
              <SeatGrid />
              <SeatLegend />
            </div>

            {/* Selection summary + book button */}
            {selectedSeatIds.length > 0 && !current && (
              <div
                className="rounded-xl px-5 py-4 flex items-center justify-between gap-4"
                style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
              >
                <div>
                  <p className="text-white font-semibold text-sm">
                    {selectedSeatIds.length} seat{selectedSeatIds.length !== 1 ? 's' : ''} selected
                  </p>
                  <p style={{ color: '#4b5563', fontSize: '0.72rem', marginTop: '2px' }}>
                    {selectedSeats.map(s => `${s.rowLabel}${s.colNumber}`).join(', ')}
                  </p>
                </div>
                <Button onClick={handleBook} loading={bookingLoading}>
                  Reserve &amp; Pay
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Booking confirmed modal ── */}
      <Modal
        open={!!current && !expired}
        onClose={() => {}}
        title="Booking Confirmed"
      >
        <div className="flex flex-col items-center gap-5">
          {/* QR code */}
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
              <span style={{ color: '#374151', fontSize: '0.8rem' }}>Generating QR…</span>
            </div>
          )}

          {/* Booking code */}
          <div className="text-center">
            <p
              className="font-mono font-bold text-lg text-white tracking-widest"
              style={{ letterSpacing: '0.15em' }}
            >
              {current?.bookingCode}
            </p>
            <p style={{ color: '#4b5563', fontSize: '0.72rem', marginTop: '4px' }}>
              Seats: {current?.seats.map(s => `${s.rowLabel}${s.colNumber}`).join(', ')}
            </p>
          </div>

          {/* QR note */}
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
    </div>
  );
};