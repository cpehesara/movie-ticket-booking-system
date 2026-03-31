import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchMyBookings, cancelBooking } from '../../../viewmodel/slices/bookingSlice';
import { BookingResponse, BookedSeatInfo } from '../../../model/types/booking.types';
import { useToast } from '../../components/common/Toast';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Loading } from '../../components/common/Loading';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

// ─── Status badge config ─────────────────────────────────────────────────────

const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:    { bg: 'rgba(234,179,8,0.1)',   text: '#facc15', label: 'Pending'    },
  CONFIRMED:  { bg: 'rgba(59,130,246,0.1)',  text: '#60a5fa', label: 'Confirmed'  },
  CHECKED_IN: { bg: 'rgba(168,85,247,0.1)',  text: '#c084fc', label: 'Checked In' },
  COMPLETED:  { bg: 'rgba(34,197,94,0.1)',   text: '#4ade80', label: 'Completed'  },
  CANCELLED:  { bg: 'rgba(75,85,99,0.12)',   text: '#6b7280', label: 'Cancelled'  },
  EXPIRED:    { bg: 'rgba(239,68,68,0.1)',   text: '#f87171', label: 'Expired'    },
};

// ─── QR Modal ─────────────────────────────────────────────────────────────────

interface QrModalProps {
  booking: BookingResponse;
  onClose: () => void;
}

const QrModal: React.FC<QrModalProps> = ({ booking, onClose }) => (
  <Modal open onClose={onClose} title="Your Ticket">
    <div className="flex flex-col items-center gap-5">
      {booking.qrCodeBase64 ? (
        <>
          {/* QR container with decorative border */}
          <div
            className="p-3 rounded-2xl"
            style={{
              backgroundColor: '#fff',
              boxShadow: '0 0 0 1px #1f2937, 0 0 32px rgba(220,38,38,0.15)',
            }}
          >
            <img
              src={`data:image/png;base64,${booking.qrCodeBase64}`}
              alt="Booking QR code"
              style={{ width: 200, height: 200, display: 'block' }}
            />
          </div>

          {/* Booking details */}
          <div
            className="w-full rounded-xl px-5 py-4 flex flex-col gap-2"
            style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
          >
            <DetailRow label="Code"   value={booking.bookingCode}  mono />
            <DetailRow label="Movie"  value={booking.movieTitle}         />
            <DetailRow label="Screen" value={booking.screenName}         />
            <DetailRow
              label="Seats"
              value={booking.seats.map((s: BookedSeatInfo) => `${s.rowLabel}${s.colNumber}`).join(', ')}
              mono
            />
            <DetailRow
              label="Time"
              value={new Date(booking.startTime).toLocaleString([], {
                dateStyle: 'medium', timeStyle: 'short',
              })}
            />
            <DetailRow label="Amount" value={`LKR ${booking.totalAmount}`} accent="#f87171" />
          </div>

          <p style={{ color: '#4b5563', fontSize: '0.72rem', textAlign: 'center' }}>
            Present this QR at the entrance kiosk. A copy was sent to your email.
          </p>
        </>
      ) : (
        <div
          className="w-full rounded-xl p-8 text-center"
          style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
        >
          <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>
            QR code is not available for this booking.
          </p>
        </div>
      )}

      <Button onClick={onClose} variant="secondary" fullWidth>Close</Button>
    </div>
  </Modal>
);

const DetailRow: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  accent?: string;
}> = ({ label, value, mono, accent }) => (
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

// ─── Booking Card ─────────────────────────────────────────────────────────────

interface BookingCardProps {
  booking: BookingResponse;
  onViewQr: () => void;
  onCancel: () => void;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onViewQr, onCancel }) => {
  const st = statusStyle[booking.status] ?? statusStyle.CANCELLED;
  const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED';
  const hasQr     = !!booking.qrCodeBase64 && (booking.status === 'CONFIRMED' || booking.status === 'CHECKED_IN');

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#374151')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1f2937')}
    >
      {/* Card header */}
      <div
        className="flex items-start justify-between px-5 py-4"
        style={{ borderBottom: '1px solid #111827' }}
      >
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">{booking.movieTitle}</h3>
          <p style={{ color: '#4b5563', fontSize: '0.72rem', marginTop: '2px' }}>
            {booking.screenName} · {booking.cinemaName}
          </p>
          <p style={{ color: '#374151', fontSize: '0.7rem', marginTop: '1px' }}>
            {new Date(booking.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
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
      <div className="px-5 py-4 flex items-center justify-between gap-4">
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

        <div className="flex items-center gap-2 flex-shrink-0">
          {hasQr && (
            <button
              onClick={onViewQr}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
              style={{
                backgroundColor: 'rgba(220,38,38,0.08)',
                border: '1px solid rgba(220,38,38,0.18)',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(220,38,38,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(220,38,38,0.08)')}
              title="View QR ticket"
            >
              <QrIcon />
              <span style={{ color: '#f87171', fontSize: '0.6rem', fontWeight: 600 }}>QR</span>
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

const QrIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h1v1h-1z M17 14h1v1h-1z M14 17h1v1h-1z M17 17h3v3h-3z" strokeWidth="0" fill="#f87171" />
  </svg>
);

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const ALL_STATUSES = ['ALL', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'PENDING', 'CANCELLED', 'EXPIRED'];

// ─── Main Component ───────────────────────────────────────────────────────────

export const BookingHistoryPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { bookings, loading } = useSelector((s: RootState) => s.bookings);
  const { showToast } = useToast();

  const [filter, setFilter]       = useState('ALL');
  const [qrBooking, setQrBooking] = useState<BookingResponse | null>(null);

  useEffect(() => { dispatch(fetchMyBookings()); }, [dispatch]);

  const handleCancel = async (id: number) => {
    const res = await dispatch(cancelBooking(id));
    if (cancelBooking.fulfilled.match(res)) showToast('Booking cancelled', 'success');
    else showToast(res.payload as string, 'error');
  };

  const filtered = filter === 'ALL'
    ? bookings
    : bookings.filter((b: BookingResponse) => b.status === filter);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">My Bookings</h1>
          <p style={{ color: '#4b5563', fontSize: '0.78rem', marginTop: '3px' }}>
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} total
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {ALL_STATUSES.map(s => {
            const count = s === 'ALL'
              ? bookings.length
              : bookings.filter(b => b.status === s).length;
            if (count === 0 && s !== 'ALL') return null;
            const active = filter === s;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: active ? 'rgba(220,38,38,0.15)' : 'transparent',
                  color: active ? '#f87171' : '#4b5563',
                  border: `1px solid ${active ? 'rgba(220,38,38,0.25)' : 'transparent'}`,
                }}
              >
                {s === 'ALL' ? 'All' : statusStyle[s]?.label ?? s}
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
              {filter === 'ALL' ? 'No bookings yet.' : `No ${filter.toLowerCase()} bookings.`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((b: BookingResponse) => (
              <BookingCard
                key={b.id}
                booking={b}
                onViewQr={() => setQrBooking(b)}
                onCancel={() => handleCancel(b.id)}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* QR Modal */}
      {qrBooking && (
        <QrModal
          booking={qrBooking}
          onClose={() => setQrBooking(null)}
        />
      )}
    </div>
  );
};