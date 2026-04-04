/**
 * SeatQrManagementPage — Admin tool to view and print permanent physical seat QR stickers.
 *
 * Seat QR codes are PERMANENT — they are affixed to physical seats and never change.
 * They are NOT related to any specific movie, session, or booking.
 *
 * QR content format: "SEAT:{seatId}"  (e.g., "SEAT:14")
 * This matches the regex in useSeatArrival: /^SEAT:(\d+)$/
 *
 * How seats are loaded (using existing backend APIs):
 *   1. Admin selects a screen from GET /api/admin/screens.
 *   2. The page finds any booking for that screen from GET /api/admin/bookings
 *      and uses its showtimeId to call GET /api/seats/{showtimeId}.
 *   3. Seat IDs are stable (tied to the physical screen, not to any showtime).
 *      Any showtime on a screen yields the same permanent seat IDs.
 *
 * Printing:
 *   window.print() is triggered, rendering a clean 4-column sticker sheet
 *   via @media print CSS rules defined in index.css.
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import QRCode from 'react-qr-code';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchAllBookings } from '../../../viewmodel/slices/adminSlice';
import { adminApi, ScreenSummary } from '../../../model/api/adminApi';
import { seatApi } from '../../../model/api/seatApi';
import { SeatInfo } from '../../../model/types/seat.types';
import { Header } from '../../components/layout/Header';
import { Sidebar } from '../../components/layout/Sidebar';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * The permanent QR payload stickered to each physical seat.
 * Format must match useSeatArrival hook regex: /^SEAT:(\d+)$/
 */
const seatQrPayload = (seatId: number) => `SEAT:${seatId}`;

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  STANDARD:   { bg: 'rgba(75,85,99,0.15)',    text: '#9ca3af', border: '#374151' },
  VIP:        { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  COUPLE:     { bg: 'rgba(244,114,182,0.12)', text: '#f472b6', border: 'rgba(244,114,182,0.3)' },
  WHEELCHAIR: { bg: 'rgba(96,165,250,0.12)',  text: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
};

// ─── QR Card ─────────────────────────────────────────────────────────────────

interface QrCardProps { seat: SeatInfo; screenName: string; cinemaName: string; }

const QrCard: React.FC<QrCardProps> = ({ seat, screenName, cinemaName }) => {
  const label   = `${seat.rowLabel}${seat.colNumber}`;
  const payload = seatQrPayload(seat.seatId);
  const tc      = TYPE_COLORS[seat.seatType] ?? TYPE_COLORS.STANDARD;

  return (
    <div
      className="qr-print-card flex flex-col items-center gap-2.5 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02]"
      style={{
        backgroundColor: '#0d1117',
        border: `1px solid ${tc.border}`,
        boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
      }}
    >
      {/* White background for QR scanability */}
      <div
        className="rounded-xl overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: '#ffffff', padding: 8, width: 108, height: 108 }}
      >
        <QRCode value={payload} size={92} level="M" style={{ display: 'block' }} />
      </div>

      {/* Seat label */}
      <p className="font-mono font-black text-white text-xl leading-none">{label}</p>

      {/* Type badge */}
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}
      >
        {seat.seatType}
      </span>

      {/* Screen info */}
      <div className="text-center" style={{ marginTop: 2 }}>
        <p style={{ color: '#4b5563', fontSize: '0.62rem' }}>{screenName}</p>
        <p style={{ color: '#374151', fontSize: '0.58rem' }}>{cinemaName}</p>
        {seat.ledIndex != null && (
          <p className="font-mono" style={{ color: '#1f2937', fontSize: '0.56rem', marginTop: 2 }}>
            LED #{seat.ledIndex}
          </p>
        )}
      </div>

      {/* QR payload */}
      <p
        className="font-mono text-center"
        style={{ color: '#374151', fontSize: '0.58rem', wordBreak: 'break-all', lineHeight: 1.3 }}
      >
        {payload}
      </p>
    </div>
  );
};

// ─── Empty state ─────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ icon: string; title: string; body: string }> = ({ icon, title, body }) => (
  <div className="rounded-2xl p-14 text-center" style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}>
    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"
      style={{ backgroundColor: '#111827' }}>
      {icon}
    </div>
    <p className="text-white font-semibold mb-2">{title}</p>
    <p style={{ color: '#4b5563', fontSize: '0.82rem', maxWidth: 360, margin: '0 auto' }}>{body}</p>
  </div>
);

// ─── Info panel ───────────────────────────────────────────────────────────────

const InfoBanner: React.FC = () => (
  <div
    className="rounded-xl px-4 py-3 mb-5 flex gap-3"
    style={{ backgroundColor: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}
  >
    <span style={{ color: '#fbbf24', fontSize: '0.9rem', flexShrink: 0, marginTop: 1 }}>▣</span>
    <p style={{ color: '#d1d5db', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>
      <strong style={{ color: '#fbbf24' }}>Permanent stickers</strong> — these QR codes are affixed
      once and never change. The format <code style={{ backgroundColor: '#111827', color: '#f87171', padding: '1px 5px', borderRadius: 4, fontSize: '0.78em' }}>SEAT:{'{seatId}'}</code> is
      scanned by customers from the <strong>My Bookings</strong> page on their phones to
      confirm they are seated correctly after entering through the entrance kiosk.
    </p>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const SeatQrManagementPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { bookings } = useSelector((s: RootState) => s.admin);

  const [screens,       setScreens]       = useState<ScreenSummary[]>([]);
  const [screensLoading, setScreensLoading] = useState(true);
  const [selectedScreenId, setSelectedScreenId] = useState<string>('');
  const [seats,         setSeats]         = useState<SeatInfo[]>([]);
  const [seatsLoading,  setSeatsLoading]  = useState(false);
  const [seatsError,    setSeatsError]    = useState<string | null>(null);
  const [screenName,    setScreenName]    = useState('');
  const [cinemaName,    setCinemaName]    = useState('');
  const [typeFilter,    setTypeFilter]    = useState('ALL');
  const [search,        setSearch]        = useState('');

  // Load screens + all bookings on mount
  useEffect(() => {
    setScreensLoading(true);
    adminApi.getScreens()
      .then((data: ScreenSummary[]) => setScreens(data))
      .finally(() => setScreensLoading(false));
    dispatch(fetchAllBookings());
  }, [dispatch]);

  // When screen is selected, load its physical seats
  useEffect(() => {
    if (!selectedScreenId) { setSeats([]); setSeatsError(null); return; }

    const screen = screens.find(s => String(s.id) === selectedScreenId);
    if (!screen) return;

    setScreenName(screen.name);
    setCinemaName(screen.cinemaName);

    setSeatsLoading(true);
    setSeatsError(null);
    adminApi.getSeatsByScreen(Number(selectedScreenId))
      .then(data => setSeats(data.filter(s => s.isActive)))
      .catch(() => setSeatsError('load_failed'))
      .finally(() => setSeatsLoading(false));
  }, [selectedScreenId, screens]);

  // Seat type counts
  const typeCounts = React.useMemo(() => {
    const c: Record<string, number> = {};
    seats.forEach(s => { c[s.seatType] = (c[s.seatType] ?? 0) + 1; });
    return c;
  }, [seats]);

  // Filtered seats
  const filtered = seats.filter(s => {
    const label = `${s.rowLabel}${s.colNumber}`.toLowerCase();
    return (
      (typeFilter === 'ALL' || s.seatType === typeFilter) &&
      (!search || label.includes(search.toLowerCase()))
    );
  });

  const selectedScreen = screens.find(s => String(s.id) === selectedScreenId);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
      <Header />
      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-6 overflow-auto no-print" style={{ minWidth: 0 }}>

          {/* ── Page header ── */}
          <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                Seat QR Stickers
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded"
                  style={{ backgroundColor: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}
                >
                  PERMANENT
                </span>
              </h1>
              <p style={{ color: '#4b5563', fontSize: '0.75rem', marginTop: '2px' }}>
                Generate and print QR stickers for physical seat labels
              </p>
            </div>

            {filtered.length > 0 && (
              <Button onClick={() => window.print()}>
                🖨 Print Stickers ({filtered.length})
              </Button>
            )}
          </div>

          {/* ── Info banner ── */}
          <InfoBanner />

          {/* ── Screen selector ── */}
          <div
            className="rounded-2xl p-5 mb-5"
            style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#374151', letterSpacing: '0.12em' }}>
              Select Screen
            </p>

            {screensLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid #1f2937', borderTopColor: '#dc2626' }} />
                <span style={{ color: '#4b5563', fontSize: '0.8rem' }}>Loading screens…</span>
              </div>
            ) : screens.length === 0 ? (
              <p style={{ color: '#f87171', fontSize: '0.8rem' }}>No screens configured.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {screens.map(sc => {
                  const active = String(sc.id) === selectedScreenId;
                  return (
                    <button
                      key={sc.id}
                      onClick={() => { setSelectedScreenId(String(sc.id)); setTypeFilter('ALL'); setSearch(''); }}
                      className="text-left rounded-xl p-4 transition-all duration-200"
                      style={{
                        backgroundColor: active ? 'rgba(220,38,38,0.1)' : '#111827',
                        border: `1px solid ${active ? 'rgba(220,38,38,0.3)' : '#1f2937'}`,
                        boxShadow: active ? '0 0 20px rgba(220,38,38,0.08)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm" style={{ color: active ? '#f87171' : '#d1d5db' }}>
                            {sc.name}
                          </p>
                          <p style={{ color: '#4b5563', fontSize: '0.7rem', marginTop: '2px' }}>
                            {sc.cinemaName}
                          </p>
                        </div>
                        <span
                          className="flex-shrink-0 text-xs px-2 py-0.5 rounded font-mono"
                          style={{ backgroundColor: '#1f2937', color: '#6b7280' }}
                        >
                          {sc.totalSeats} seats
                        </span>
                      </div>
                      {active && seats.length > 0 && (
                        <p style={{ color: '#374151', fontSize: '0.62rem', marginTop: 4 }}>
                          {seats.length} QR codes loaded
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Stats row when loaded */}
            {selectedScreen && seats.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4" style={{ borderTop: '1px solid #1f2937' }}>
                <span
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: '#111827', border: '1px solid #1f2937', color: '#9ca3af' }}
                >
                  <span style={{ color: '#374151' }}>Total: </span>
                  <strong style={{ color: '#d1d5db' }}>{seats.length} seats</strong>
                </span>
                {Object.entries(typeCounts).map(([type, count]) => {
                  const tc = TYPE_COLORS[type] ?? TYPE_COLORS.STANDARD;
                  return (
                    <span key={type}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: tc.bg, border: `1px solid ${tc.border}`, color: tc.text }}
                    >
                      {type}: {count}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Filter bar ── */}
          {seats.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search seat (A1, B12)…"
                className="rounded-lg px-4 py-2 text-sm focus:outline-none"
                style={{
                  backgroundColor: '#111827',
                  border: '1px solid #1f2937',
                  color: '#d1d5db',
                  width: 200,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#dc2626')}
                onBlur={e  => (e.currentTarget.style.borderColor = '#1f2937')}
              />
              {(['ALL', 'STANDARD', 'VIP', 'COUPLE', 'WHEELCHAIR'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className="rounded-lg px-3 py-2 text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: typeFilter === t ? '#dc2626' : '#111827',
                    color: typeFilter === t ? '#fff' : '#6b7280',
                    border: `1px solid ${typeFilter === t ? '#dc2626' : '#1f2937'}`,
                    cursor: 'pointer',
                  }}
                >
                  {t}
                  {t !== 'ALL' && typeCounts[t] != null && (
                    <span className="ml-1.5 font-mono"
                      style={{ opacity: 0.7, fontSize: '0.65rem' }}>
                      {typeCounts[t]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── Body ── */}
          {!selectedScreenId && (
            <EmptyState
              icon="▣"
              title="Select a Screen"
              body="Choose a screen above to load its permanent seat QR codes. These stickers are printed once and affixed to seats for the cinema's lifetime."
            />
          )}

          {selectedScreenId && seatsLoading && (
            <div className="flex justify-center py-16"><Loading message="Loading seat layout…" /></div>
          )}

          {/* (Removed no_bookings check as we now load directly from screen) */}

          {selectedScreenId && !seatsLoading && seatsError === 'load_failed' && (
            <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: '#0d1117', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ color: '#f87171', fontSize: '0.85rem' }}>Failed to load seat map. Please try again.</p>
            </div>
          )}

          {!seatsLoading && filtered.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p style={{ color: '#4b5563', fontSize: '0.75rem' }}>
                  Showing <strong style={{ color: '#9ca3af' }}>{filtered.length}</strong> of {seats.length} seats ·{' '}
                  <span className="font-mono" style={{ color: '#374151' }}>QR format: SEAT:{'{id}'}</span>
                </p>
              </div>

              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
              >
                {filtered.map(seat => (
                  <QrCard
                    key={seat.seatId}
                    seat={seat}
                    screenName={screenName}
                    cinemaName={cinemaName}
                  />
                ))}
              </div>
            </>
          )}

          {!seatsLoading && seats.length > 0 && filtered.length === 0 && (
            <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}>
              <p style={{ color: '#374151', fontSize: '0.85rem' }}>No seats match the current filter.</p>
            </div>
          )}
        </main>
      </div>

      {/* ── Print layout (hidden on screen, shown on print) ── */}
      <div style={{ display: 'none' }}>
        <div
          style={{
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '2px solid #000',
            fontFamily: 'sans-serif',
          }}
          className="print-only"
        >
          <h1 style={{ fontSize: '1rem', fontWeight: 900, margin: 0 }}>CinePlex — Permanent Seat QR Stickers</h1>
          <p style={{ fontSize: '0.78rem', margin: '4px 0 0', color: '#444' }}>
            {screenName} · {cinemaName} · {filtered.length} seats
          </p>
          <p style={{ fontSize: '0.68rem', color: '#888', margin: '2px 0 0' }}>
            Printed {new Date().toLocaleString()} · Affix to physical seats — these QR codes are permanent.
          </p>
        </div>

        <div className="qr-print-grid">
          {filtered.map(seat => (
            <div key={seat.seatId} className="qr-print-card">
              <div style={{ backgroundColor: '#fff', padding: 4, display: 'inline-block', borderRadius: 4 }}>
                <QRCode value={seatQrPayload(seat.seatId)} size={80} level="M" />
              </div>
              <p style={{ fontWeight: 900, fontSize: '1rem', margin: '6px 0 2px', fontFamily: 'monospace' }}>
                {seat.rowLabel}{seat.colNumber}
              </p>
              <p style={{ fontSize: '0.7rem', color: '#555', margin: 0 }}>{seat.seatType}</p>
              <p style={{ fontSize: '0.6rem', color: '#888', margin: '2px 0 0', fontFamily: 'monospace' }}>
                {seatQrPayload(seat.seatId)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
