import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchSeatMap, clearSeatMap } from '../../../viewmodel/slices/seatSlice';
import { useWebSocket } from '../../../viewmodel/hooks/useWebSocket';
import { SeatInfo, SeatState } from '../../../model/types/seat.types';
import { Loading } from '../../components/common/Loading';

// ─── LED colour mapping ───────────────────────────────────────────────────────

const ledBg: Record<SeatState, string> = {
  AVAILABLE:   '#16a34a',
  RESERVED:    '#ca8a04',
  BOOKED:      '#2563eb',
  OCCUPIED:    '#dc2626',
  CANCELLED:   '#16a34a',
  MAINTENANCE: '#374151',
};

const ledGlow: Record<SeatState, string> = {
  AVAILABLE:   '0 0 7px 2px rgba(34,197,94,0.45)',
  RESERVED:    '0 0 9px 3px rgba(202,138,4,0.55)',
  BOOKED:      '0 0 9px 3px rgba(37,99,235,0.55)',
  OCCUPIED:    'none',
  CANCELLED:   '0 0 7px 2px rgba(34,197,94,0.45)',
  MAINTENANCE: 'none',
};

// ─── Seat LED dot ─────────────────────────────────────────────────────────────

interface LedDotProps {
  seat: SeatInfo;
  inTransit: boolean;
  size: number;
}

const LedDot: React.FC<LedDotProps> = ({ seat, inTransit, size }) => {
  if (!seat.isActive) return <div style={{ width: size, height: size }} />;

  const dimmed = !inTransit && (seat.seatState === 'OCCUPIED' || seat.seatState === 'MAINTENANCE');

  return (
    <div
      title={`${seat.rowLabel}${seat.colNumber} · ${inTransit ? 'IN TRANSIT' : seat.seatState}`}
      className={`rounded-full relative ${inTransit ? 'animate-pulse' : ''}`}
      style={{
        width: size,
        height: size,
        backgroundColor: inTransit ? '#f97316' : ledBg[seat.seatState],
        opacity: dimmed ? 0.18 : 1,
        boxShadow: inTransit
          ? '0 0 18px 7px rgba(251,146,60,0.85)'
          : dimmed ? 'none' : ledGlow[seat.seatState],
        transition: 'all 0.6s ease',
        flexShrink: 0,
      }}
    >
      {inTransit && (
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{ backgroundColor: 'rgba(251,146,60,0.35)', animationDuration: '0.85s' }}
        />
      )}
    </div>
  );
};

// ─── Legend item ──────────────────────────────────────────────────────────────

const LegendItem: React.FC<{
  color: string;
  glow?: string;
  label: string;
  count?: number;
  pulse?: boolean;
}> = ({ color, glow, label, count, pulse }) => (
  <div className="flex items-center gap-2">
    <span
      className={`inline-block rounded-full ${pulse ? 'animate-pulse' : ''}`}
      style={{
        width: 10,
        height: 10,
        backgroundColor: color,
        boxShadow: glow ?? 'none',
        flexShrink: 0,
      }}
    />
    <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>
      {label}
      {count !== undefined && (
        <span
          className="ml-1.5 font-mono font-bold"
          style={{ color: color }}
        >
          {count}
        </span>
      )}
    </span>
  </div>
);

// ─── Clock ────────────────────────────────────────────────────────────────────

const LiveClock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono" style={{ color: '#374151', fontSize: '0.8rem' }}>
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * HallDisplayPage — Large-screen hall board mounted outside each cinema screen.
 * Renders a dark-room LED strip simulation showing real-time seat occupancy.
 * Subscribes to WebSocket seat updates and IoT events.
 *
 * Accessed via /display/:showtimeId
 */
export const HallDisplayPage: React.FC = () => {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const id = Number(showtimeId);

  const dispatch = useDispatch<AppDispatch>();
  const { seatMap, loading } = useSelector((s: RootState) => s.seats);
  const { inTransitSeatIds } = useSelector((s: RootState) => s.iot);

  // Subscribe to both seat updates and IoT events
  useWebSocket(id, { subscribeIoT: true });

  useEffect(() => {
    dispatch(fetchSeatMap(id));
    const interval = setInterval(() => dispatch(fetchSeatMap(id)), 30_000);
    return () => { clearInterval(interval); dispatch(clearSeatMap()); };
  }, [id, dispatch]);

  // Group seats by row
  const rows = React.useMemo(() => {
    if (!seatMap) return {} as Record<string, SeatInfo[]>;
    return seatMap.seats.reduce<Record<string, SeatInfo[]>>((acc, seat) => {
      if (!acc[seat.rowLabel]) acc[seat.rowLabel] = [];
      acc[seat.rowLabel].push(seat);
      return acc;
    }, {});
  }, [seatMap]);

  const rowLabels = Object.keys(rows).sort();

  // Stats
  const seats = seatMap?.seats.filter(s => s.isActive) ?? [];
  const statAvail  = seats.filter(s => s.seatState === 'AVAILABLE' || s.seatState === 'CANCELLED').length;
  const statBooked = seats.filter(s => s.seatState === 'BOOKED').length;
  const statOcc    = seats.filter(s => s.seatState === 'OCCUPIED').length;
  const statRes    = seats.filter(s => s.seatState === 'RESERVED').length;
  const inTransit  = inTransitSeatIds.length;

  // Adaptive dot size based on seat count
  const dotSize = seats.length > 40 ? 14 : seats.length > 20 ? 18 : 24;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#000', color: '#fff' }}
    >
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-8 py-4"
        style={{ borderBottom: '1px solid #0f0f0f' }}
      >
        <div className="flex items-center gap-6">
          <span
            className="font-black tracking-widest uppercase"
            style={{ color: '#dc2626', fontSize: '1rem', letterSpacing: '0.3em' }}
          >
            CinePlex
          </span>
          {seatMap && (
            <span style={{ color: '#1f2937', fontSize: '0.75rem' }}>
              {seatMap.screenName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-6">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full animate-pulse inline-block"
              style={{ backgroundColor: '#dc2626', boxShadow: '0 0 6px #dc2626' }}
            />
            <span style={{ color: '#374151', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
              LIVE
            </span>
          </div>
          <LiveClock />
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-6">
        {loading && !seatMap ? (
          <Loading message="Loading…" />
        ) : seatMap ? (
          <>
            {/* Screen glow bar */}
            <div className="flex flex-col items-center mb-8" style={{ width: '100%', maxWidth: '700px' }}>
              <div
                style={{
                  width: '65%',
                  height: '2px',
                  background: 'linear-gradient(to right, transparent, #ef4444 25%, #dc2626 50%, #ef4444 75%, transparent)',
                  boxShadow: '0 0 20px 6px rgba(220,38,38,0.45)',
                  borderRadius: '1px',
                }}
              />
              <p
                className="mt-2 tracking-widest uppercase font-mono"
                style={{ color: '#1a1a1a', fontSize: '0.6rem', letterSpacing: '0.4em' }}
              >
                screen
              </p>
            </div>

            {/* LED seat grid */}
            <div className="flex flex-col items-center gap-3">
              {rowLabels.map(row => (
                <div key={row} className="flex items-center gap-2.5">
                  <span
                    className="font-mono text-right select-none"
                    style={{ width: '1rem', fontSize: '0.6rem', color: '#111' }}
                  >
                    {row}
                  </span>
                  <div className="flex gap-2">
                    {rows[row]
                      .sort((a, b) => a.colNumber - b.colNumber)
                      .map(seat => (
                        <LedDot
                          key={seat.seatId}
                          seat={seat}
                          inTransit={inTransitSeatIds.includes(seat.seatId)}
                          size={dotSize}
                        />
                      ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8">
              <LegendItem color="#16a34a" glow="0 0 6px rgba(34,197,94,0.4)"  label="Available"  count={statAvail}  />
              <LegendItem color="#ca8a04" glow="0 0 6px rgba(202,138,4,0.4)"  label="Reserved"   count={statRes}   />
              <LegendItem color="#2563eb" glow="0 0 6px rgba(37,99,235,0.4)"  label="Booked"     count={statBooked} />
              <LegendItem color="#f97316" glow="0 0 6px rgba(249,115,22,0.6)" label="In Transit" count={inTransit}  pulse={inTransit > 0} />
              <LegendItem color="#222"                                          label="Occupied"   count={statOcc}   />
            </div>

            {/* Availability bar */}
            {seatMap.totalSeats > 0 && (
              <div className="mt-6 w-full max-w-xs">
                <div className="flex justify-between mb-1.5">
                  <span style={{ color: '#1f2937', fontSize: '0.65rem' }}>Occupancy</span>
                  <span style={{ color: '#1f2937', fontSize: '0.65rem' }}>
                    {seatMap.availableCount} / {seatMap.totalSeats} available
                  </span>
                </div>
                <div
                  className="w-full rounded-full overflow-hidden"
                  style={{ height: '3px', backgroundColor: '#0d0d0d' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${((seatMap.totalSeats - seatMap.availableCount) / seatMap.totalSeats) * 100}%`,
                      background: 'linear-gradient(to right, #dc2626, #b91c1c)',
                    }}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <p style={{ color: '#111' }}>No seat map loaded.</p>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="px-8 py-3" style={{ borderTop: '1px solid #0a0a0a' }}>
        <p style={{ color: '#111', fontSize: '0.6rem', textAlign: 'center' }}>
          Real-time seat map · Updates automatically · IT 3052 Cinema Seat Management System
        </p>
      </footer>
    </div>
  );
};