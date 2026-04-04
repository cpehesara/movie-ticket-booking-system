/**
 * BookingHistoryPage — Customer's full booking history.
 *
 * Key IoT flows integrated here:
 *
 *  ENTRANCE TICKET (Booking QR):
 *    • Generated at payment time — unique per booking (BK-XXXXXXXX).
 *    • Shown in the QR modal for CONFIRMED / CHECKED_IN bookings.
 *    • Automatically becomes invalid after the session has passed
 *      (backend marks booking as EXPIRED/COMPLETED).
 *    • Customer presents this QR at the entrance kiosk (door scan → LED activation).
 *
 *  SEAT CONFIRMATION (Customer Phone):
 *    • After door scan, customer walks to their seat.
 *    • On CHECKED_IN bookings a "Confirm My Seat" button appears.
 *    • Tapping opens a camera scanner on the customer's own phone.
 *    • Customer scans the PERMANENT physical QR sticker on their seat.
 *    • Format sent to backend: raw QR payload (SEAT:{id} or HMAC-signed format)
 *    • Calls POST /api/seat-arrival/scan → seat GUIDING→OCCUPIED, LED turns off.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchMyBookings, cancelBooking } from '../../../viewmodel/slices/bookingSlice';
import { BookingResponse, BookedSeatInfo } from '../../../model/types/booking.types';
import { seatArrivalApi } from '../../../model/api/seatArrivalApi';
import { useToast } from '../../components/common/Toast';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Loading } from '../../components/common/Loading';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { QrScanner } from '../../components/common/QrScanner';

// ─── Status config ─────────────────────────────────────────────────────────────

const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:    { bg: 'rgba(234,179,8,0.1)',    text: '#facc15', label: 'Pending'    },
  CONFIRMED:  { bg: 'rgba(59,130,246,0.1)',   text: '#60a5fa', label: 'Confirmed'  },
  CHECKED_IN: { bg: 'rgba(251,146,60,0.12)',  text: '#fb923c', label: 'Checked In' },
  COMPLETED:  { bg: 'rgba(34,197,94,0.1)',    text: '#4ade80', label: 'Completed'  },
  CANCELLED:  { bg: 'rgba(75,85,99,0.12)',    text: '#6b7280', label: 'Cancelled'  },
  EXPIRED:    { bg: 'rgba(239,68,68,0.1)',    text: '#f87171', label: 'Expired'    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the showtime start time is in the past. */
const sessionPassed = (startTime: string): boolean =>
  new Date(startTime).getTime() < Date.now();

/** Returns true if the booking QR is still valid (can be used for entry). */
const qrIsValid = (b: BookingResponse): boolean =>
  !!b.qrCodeBase64 &&
  (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') &&
  !sessionPassed(b.startTime);

// ─── Entrance Ticket QR Modal ─────────────────────────────────────────────────

interface QrModalProps { booking: BookingResponse; onClose: () => void; }

const QrModal: React.FC<QrModalProps> = ({ booking, onClose }) => {
  const expired = sessionPassed(booking.startTime) || booking.status === 'EXPIRED';

  return (
    <Modal open onClose={onClose} title="Entrance Ticket">
      <div className="flex flex-col items-center gap-5">

        {/* Expired overlay */}
        {expired ? (
          <div
            className="w-full rounded-2xl p-8 text-center"
            style={{ backgroundColor: '#0d1117', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <div className="text-3xl mb-3">🔒</div>
            <p className="font-bold text-white mb-1">Session Expired</p>
            <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>
              This booking QR is no longer valid. The showtime has already passed.
            </p>
          </div>
        ) : booking.qrCodeBase64 ? (
          <>
            {/* Tag: entrance ticket */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: 'rgba(220,38,38,0.1)', color: '#f87171', border: '1px solid rgba(220,38,38,0.2)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              ENTRANCE TICKET — Scan at door kiosk
            </div>

            {/* QR code */}
            <div
              className="p-3 rounded-2xl"
              style={{ backgroundColor: '#fff', boxShadow: '0 0 0 1px #1f2937, 0 0 32px rgba(220,38,38,0.12)' }}
            >
              <img
                src={`data:image/png;base64,${booking.qrCodeBase64}`}
                alt="Booking QR"
                style={{ width: 200, height: 200, display: 'block' }}
              />
            </div>

            {/* Booking details */}
            <div className="w-full rounded-xl px-5 py-4 flex flex-col gap-2"
              style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}>
              <DR label="Code"   value={booking.bookingCode} mono />
              <DR label="Movie"  value={booking.movieTitle} />
              <DR label="Screen" value={booking.screenName} />
              <DR
                label="Seats"
                value={booking.seats.map((s: BookedSeatInfo) => `${s.rowLabel}${s.colNumber}`).join(', ')}
                mono
              />
              <DR
                label="Show Time"
                value={new Date(booking.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              />
              <DR label="Amount" value={`LKR ${booking.totalAmount}`} accent="#f87171" />
            </div>

            <p style={{ color: '#4b5563', fontSize: '0.72rem', textAlign: 'center' }}>
              Present this QR at the entrance kiosk. A copy was sent to your email.
            </p>
          </>
        ) : (
          <div className="w-full rounded-xl p-8 text-center"
            style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}>
            <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>QR code not available for this booking.</p>
          </div>
        )}

        <Button onClick={onClose} variant="secondary" fullWidth>Close</Button>
      </div>
    </Modal>
  );
};

const DR: React.FC<{ label: string; value: string; mono?: boolean; accent?: string }> = ({
  label, value, mono, accent,
}) => (
  <div className="flex justify-between gap-3 items-baseline">
    <span style={{ color: '#4b5563', fontSize: '0.72rem', flexShrink: 0 }}>{label}</span>
    <span
      className={mono ? 'font-mono' : ''}
      style={{ color: accent ?? '#d1d5db', fontSize: '0.78rem', fontWeight: 500, textAlign: 'right' }}
    >
      {value}
    </span>
  </div>
);

// ─── Seat Scan Modal (customer confirms their seat via phone camera) ───────────

interface SeatScanModalProps {
  booking: BookingResponse;
  onClose: () => void;
  onSuccess: () => void;
}

const SeatScanModal: React.FC<SeatScanModalProps> = ({ booking, onClose, onSuccess }) => {
  const [phase, setPhase]           = useState<'scanning' | 'loading' | 'success' | 'error'>('scanning');
  const [errorMsg, setErrorMsg]     = useState('');
  const [scannerActive, setScannerActive] = useState(true);
  const [confirmedSeats, setConfirmedSeats] = useState<BookedSeatInfo[]>([]);

  const handleScan = useCallback(async (rawQr: string) => {
    setScannerActive(false);

    // Accept both legacy SEAT:{id} and new HMAC format SEAT:{id}:{screenId}:{row}:{col}:{hmac}
    const match = rawQr.trim().match(/^SEAT:(\d+)/);
    if (!match) {
      setErrorMsg(`Unrecognised QR code. Expected a seat QR starting with SEAT:. Got: "${rawQr}"`);
      setPhase('error');
      return;
    }

    const seatId = parseInt(match[1], 10);

    // Client-side sanity check: scanned seatId must belong to this booking
    const belongsToBooking = booking.seats.some(s => s.seatId === seatId);
    if (!belongsToBooking) {
      setErrorMsg(
        `Seat QR does not match your booking. ` +
        `Your seats: ${booking.seats.map(s => `${s.rowLabel}${s.colNumber}`).join(', ')}. ` +
        `Please scan the QR sticker on your assigned seat.`
      );
      setPhase('error');
      return;
    }

    setPhase('loading');
    try {
      await seatArrivalApi.confirm(rawQr.trim());
      setConfirmedSeats(booking.seats);
      setPhase('success');
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? 'Seat confirmation failed. Please try again.');
      setPhase('error');
    }
  }, [booking]);

  return (
    <Modal open onClose={phase === 'loading' ? () => {} : onClose} title="Confirm Your Seat">
      <div className="flex flex-col items-center gap-5">

        {/* Header guidance */}
        <div
          className="w-full flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ backgroundColor: 'rgba(251,146,60,0.07)', border: '1px solid rgba(251,146,60,0.25)' }}
        >
          <div className="relative flex-shrink-0">
            <div className="w-3.5 h-3.5 rounded-full animate-led-blink" style={{ backgroundColor: '#f97316' }} />
            <div className="absolute inset-0 rounded-full animate-ping"
              style={{ backgroundColor: 'rgba(249,115,22,0.35)', animationDuration: '0.9s' }} />
          </div>
          <div>
            <p style={{ color: '#fb923c', fontSize: '0.78rem', fontWeight: 700 }}>
              Seat LED is blinking — you're almost there!
            </p>
            <p style={{ color: '#92400e', fontSize: '0.67rem', marginTop: '1px' }}>
              Scan the QR sticker on your seat to confirm arrival
            </p>
          </div>
        </div>

        {/* Your seat reminder */}
        <div className="w-full flex flex-wrap gap-2 justify-center">
          {booking.seats.map((s: BookedSeatInfo) => (
            <div
              key={s.seatId}
              className="flex items-center gap-2 rounded-xl px-4 py-2"
              style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: '#f97316', boxShadow: '0 0 6px rgba(249,115,22,0.6)' }}
              />
              <span className="font-mono font-black text-white">{s.rowLabel}{s.colNumber}</span>
              {s.seatType !== 'STANDARD' && (
                <span style={{ color: '#4b5563', fontSize: '0.68rem' }}>{s.seatType}</span>
              )}
            </div>
          ))}
        </div>

        {/* ── Scanning phase ── */}
        {phase === 'scanning' && (
          <>
            <p style={{ color: '#6b7280', fontSize: '0.8rem', textAlign: 'center' }}>
              Point your camera at the QR sticker on your seat
            </p>

            {/* Camera frame */}
            <div
              className="relative w-full rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(34,197,94,0.25)', backgroundColor: '#0d1117' }}
            >
              {/* Animated green scan line */}
              {scannerActive && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl" style={{ zIndex: 10 }}>
                  <div
                    className="animate-scanline"
                    style={{
                      position: 'absolute', left: 0, right: 0, height: '2px',
                      background: 'linear-gradient(to right, transparent, #22c55e 30%, #86efac 50%, #22c55e 70%, transparent)',
                      boxShadow: '0 0 12px 4px rgba(34,197,94,0.5)',
                    }}
                  />
                </div>
              )}
              {/* Green corner brackets */}
              {(['tl','tr','bl','br'] as const).map(pos => {
                const s = 20;
                const t = 3;
                const shared: React.CSSProperties = { position: 'absolute', backgroundColor: '#22c55e' };
                return (
                  <React.Fragment key={pos}>
                    <span style={{ ...shared,
                      top: pos.startsWith('t') ? 0 : 'auto',
                      bottom: pos.startsWith('b') ? 0 : 'auto',
                      left: pos.endsWith('l') ? 0 : 'auto',
                      right: pos.endsWith('r') ? 0 : 'auto',
                      width: s, height: t,
                    }} />
                    <span style={{ ...shared,
                      top: pos.startsWith('t') ? 0 : 'auto',
                      bottom: pos.startsWith('b') ? 0 : 'auto',
                      left: pos.endsWith('l') ? 0 : 'auto',
                      right: pos.endsWith('r') ? 0 : 'auto',
                      width: t, height: s,
                    }} />
                  </React.Fragment>
                );
              })}
              <div className="p-3">
                <QrScanner onScan={handleScan} active={scannerActive} />
              </div>
            </div>

            {/* Camera status */}
            <div
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg"
              style={{ backgroundColor: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}
            >
              {scannerActive ? (
                <>
                  <span className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                  <span style={{ color: '#9ca3af', fontSize: '0.7rem' }}>Camera active — scan seat QR sticker</span>
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => { setScannerActive(true); setPhase('scanning'); }}>
                  ↺ Retry Scan
                </Button>
              )}
            </div>
          </>
        )}

        {/* ── Loading phase ── */}
        {phase === 'loading' && (
          <div className="py-4">
            <Loading message="Confirming your seat…" />
          </div>
        )}

        {/* ── Success phase ── */}
        {phase === 'success' && (
          <div className="w-full flex flex-col items-center gap-4 animate-slide-up">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
              style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              🎬
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black text-white">You're all set!</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: 4 }}>
                {booking.movieTitle}
              </p>
            </div>

            {/* Confirmed seats */}
            <div className="w-full flex flex-col gap-2">
              {confirmedSeats.map((s: BookedSeatInfo) => (
                <div
                  key={s.seatId}
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ backgroundColor: '#111827', border: '1px solid rgba(34,197,94,0.15)' }}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: '#16a34a', boxShadow: '0 0 8px rgba(22,163,74,0.6)' }}
                  />
                  <span className="font-mono font-black text-white">{s.rowLabel}{s.colNumber}</span>
                  <span style={{ color: '#6b7280', fontSize: '0.72rem', flex: 1 }}>{s.seatType}</span>
                  <span className="text-xs font-semibold" style={{ color: '#4ade80' }}>✓ Confirmed</span>
                </div>
              ))}
            </div>

            <p style={{ color: '#374151', fontSize: '0.72rem', textAlign: 'center' }}>
              The LED at your seat has been turned off. Enjoy the show!
            </p>

            <Button
              variant="primary"
              fullWidth
              onClick={() => { onSuccess(); onClose(); }}
            >
              Done
            </Button>
          </div>
        )}

        {/* ── Error phase ── */}
        {phase === 'error' && (
          <div className="w-full flex flex-col gap-3 animate-slide-up">
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ backgroundColor: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
            >
              <p className="font-semibold mb-1">Scan Failed</p>
              <p style={{ fontSize: '0.78rem', color: '#f87171', opacity: 0.8 }}>{errorMsg}</p>
            </div>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => { setPhase('scanning'); setScannerActive(true); setErrorMsg(''); }}
            >
              ↺ Try Again
            </Button>
            <Button variant="ghost" fullWidth onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}

        {phase === 'scanning' && (
          <Button variant="ghost" fullWidth size="sm" onClick={onClose}>
            Cancel
          </Button>
        )}
      </div>
    </Modal>
  );
};

// ─── QR icon ─────────────────────────────────────────────────────────────────

const QrIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h1v1h-1z M17 14h1v1h-1z M14 17h1v1h-1z M17 17h3v3h-3z" strokeWidth="0" fill="currentColor" />
  </svg>
);

// ─── Booking Card ─────────────────────────────────────────────────────────────

interface BookingCardProps {
  booking: BookingResponse;
  onViewQr: () => void;
  onScanSeat: () => void;
  onCancel: () => void;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onViewQr, onScanSeat, onCancel }) => {
  const st = statusStyle[booking.status] ?? statusStyle.CANCELLED;

  const canCancel      = booking.status === 'PENDING' || booking.status === 'CONFIRMED';
  const showQr         = qrIsValid(booking);
  const showSeatScan   = booking.status === 'CHECKED_IN' && !sessionPassed(booking.startTime);
  const isExpired      = sessionPassed(booking.startTime) && (booking.status === 'CONFIRMED' || booking.status === 'CHECKED_IN');

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        backgroundColor: '#0d1117',
        border: `1px solid ${showSeatScan ? 'rgba(251,146,60,0.25)' : '#1f2937'}`,
        boxShadow: showSeatScan ? '0 0 20px rgba(251,146,60,0.06)' : 'none',
      }}
    >
      {/* CHECKED_IN top banner */}
      {showSeatScan && (
        <div
          className="flex items-center gap-2 px-5 py-2"
          style={{ backgroundColor: 'rgba(251,146,60,0.08)', borderBottom: '1px solid rgba(251,146,60,0.15)' }}
        >
          <div className="relative flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full animate-led-blink" style={{ backgroundColor: '#f97316' }} />
            <div className="absolute inset-0 rounded-full animate-ping"
              style={{ backgroundColor: 'rgba(249,115,22,0.4)', animationDuration: '0.9s' }} />
          </div>
          <p style={{ color: '#fb923c', fontSize: '0.72rem', fontWeight: 700 }}>
            At your seat? Tap "Confirm Seat" to scan your seat QR
          </p>
        </div>
      )}

      {/* Card header */}
      <div className="flex items-start justify-between px-5 py-4" style={{ borderBottom: '1px solid #111827' }}>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">{booking.movieTitle}</h3>
          <p style={{ color: '#4b5563', fontSize: '0.72rem', marginTop: '2px' }}>
            {booking.screenName} · {booking.cinemaName}
          </p>
          <p style={{ color: '#374151', fontSize: '0.7rem', marginTop: '1px' }}>
            {new Date(booking.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            {isExpired && (
              <span className="ml-2 text-xs font-semibold" style={{ color: '#f87171' }}>· Session passed</span>
            )}
          </p>
        </div>
        <span
          className="ml-4 flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{ backgroundColor: st.bg, color: st.text }}
        >
          {st.label}
        </span>
      </div>

      {/* Card body */}
      <div className="px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p style={{ fontSize: '0.75rem' }}>
            <span style={{ color: '#4b5563' }}>Seats </span>
            <span className="text-white font-semibold">
              {booking.seats.map(s => `${s.rowLabel}${s.colNumber}`).join(', ')}
            </span>
          </p>
          <p className="font-mono" style={{ color: '#374151', fontSize: '0.68rem' }}>
            {booking.bookingCode}
          </p>
          <p className="font-semibold" style={{ color: '#f87171', fontSize: '0.8rem' }}>
            LKR {booking.totalAmount}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">

          {/* Entrance QR button */}
          {showQr && (
            <button
              onClick={onViewQr}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
              style={{ backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)', color: '#f87171' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(220,38,38,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(220,38,38,0.08)')}
              title="View entrance ticket QR"
            >
              <QrIcon />
              <span style={{ fontSize: '0.58rem', fontWeight: 600 }}>Ticket</span>
            </button>
          )}

          {/* Seat confirmation button (only for CHECKED_IN) */}
          {showSeatScan && (
            <button
              onClick={onScanSeat}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all animate-slide-up"
              style={{
                backgroundColor: 'rgba(251,146,60,0.12)',
                border: '1px solid rgba(251,146,60,0.35)',
                color: '#fb923c',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(251,146,60,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(251,146,60,0.12)')}
            >
              <span style={{ fontSize: '1rem' }}>📷</span>
              Confirm Seat
            </button>
          )}

          {canCancel && (
            <Button variant="danger" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Filter tabs ─────────────────────────────────────────────────────────────

const ALL_STATUSES = ['ALL', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'PENDING', 'CANCELLED', 'EXPIRED'];

// ─── Main Component ───────────────────────────────────────────────────────────

export const BookingHistoryPage: React.FC = () => {
  const dispatch  = useDispatch<AppDispatch>();
  const { bookings, loading } = useSelector((s: RootState) => s.bookings);
  const { showToast } = useToast();

  const [filter,      setFilter]      = useState('ALL');
  const [qrBooking,   setQrBooking]   = useState<BookingResponse | null>(null);
  const [seatBooking, setSeatBooking] = useState<BookingResponse | null>(null);

  useEffect(() => { dispatch(fetchMyBookings()); }, [dispatch]);

  const handleCancel = async (id: number) => {
    const res = await dispatch(cancelBooking(id));
    if (cancelBooking.fulfilled.match(res)) showToast('Booking cancelled', 'success');
    else showToast(res.payload as string, 'error');
  };

  const handleSeatConfirmed = () => {
    dispatch(fetchMyBookings());   // refresh so CHECKED_IN → COMPLETED reflects in the list
    showToast('Seat confirmed — enjoy the show!', 'success');
  };

  const filtered = filter === 'ALL'
    ? bookings
    : bookings.filter((b: BookingResponse) => b.status === filter);

  // Count how many CHECKED_IN bookings need seat scan
  const awaitingSeat = bookings.filter(
    b => b.status === 'CHECKED_IN' && !sessionPassed(b.startTime)
  ).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">

        {/* Page header */}
        <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">My Bookings</h1>
            <p style={{ color: '#4b5563', fontSize: '0.78rem', marginTop: '3px' }}>
              {bookings.length} booking{bookings.length !== 1 ? 's' : ''} total
            </p>
          </div>

          {/* Seat scan nudge */}
          {awaitingSeat > 0 && (
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 animate-slide-up"
              style={{
                backgroundColor: 'rgba(251,146,60,0.08)',
                border: '1px solid rgba(251,146,60,0.25)',
              }}
            >
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full animate-led-blink" style={{ backgroundColor: '#f97316' }} />
                <div className="absolute inset-0 rounded-full animate-ping"
                  style={{ backgroundColor: 'rgba(249,115,22,0.4)', animationDuration: '0.9s' }} />
              </div>
              <p style={{ color: '#fb923c', fontSize: '0.75rem', fontWeight: 700 }}>
                {awaitingSeat} seat{awaitingSeat > 1 ? 's' : ''} need confirmation
              </p>
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {ALL_STATUSES.map(s => {
            const count = s === 'ALL'
              ? bookings.length
              : bookings.filter(b => b.status === s).length;
            if (count === 0 && s !== 'ALL') return null;
            const active = filter === s;
            const ss = statusStyle[s];
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: active ? (ss ? ss.bg : 'rgba(220,38,38,0.15)') : 'transparent',
                  color: active ? (ss ? ss.text : '#f87171') : '#4b5563',
                  border: `1px solid ${active ? (ss ? ss.text + '40' : 'rgba(220,38,38,0.25)') : 'transparent'}`,
                  cursor: 'pointer',
                }}
              >
                {s === 'ALL' ? 'All' : ss?.label ?? s}
                <span className="ml-1 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Booking list */}
        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
          >
            <p style={{ color: '#374151', fontSize: '0.9rem' }}>
              {filter === 'ALL' ? 'No bookings yet.' : `No ${(statusStyle[filter]?.label ?? filter).toLowerCase()} bookings.`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((b: BookingResponse) => (
              <BookingCard
                key={b.id}
                booking={b}
                onViewQr={() => setQrBooking(b)}
                onScanSeat={() => setSeatBooking(b)}
                onCancel={() => handleCancel(b.id)}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* Entrance ticket QR modal */}
      {qrBooking && (
        <QrModal booking={qrBooking} onClose={() => setQrBooking(null)} />
      )}

      {/* Customer seat scan modal */}
      {seatBooking && (
        <SeatScanModal
          booking={seatBooking}
          onClose={() => setSeatBooking(null)}
          onSuccess={handleSeatConfirmed}
        />
      )}
    </div>
  );
};
