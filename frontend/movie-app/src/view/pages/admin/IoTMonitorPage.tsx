// FILE PATH: src/view/pages/admin/IoTMonitorPage.tsx

import React, { useEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchSeatMap, clearSeatMap, applySeatUpdate } from '../../../viewmodel/slices/seatSlice';
import {
  receiveEvent,
  triggerResync,
  clearEvents,
  markInTransit,
  clearInTransit,
} from '../../../viewmodel/slices/iotSlice';
import { fetchAllBookings } from '../../../viewmodel/slices/adminSlice';
import { wsService } from '../../../model/services/webSocketService';
import { IoTEvent } from '../../../model/types/iot_types';
import { SeatWebSocketUpdate, SeatInfo, SeatState } from '../../../model/types/seat.types';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';
import { SeatLegend } from '../../components/seat-map/SeatLegend';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EVENT_ICONS: Record<string, string> = {
  DOOR_SCAN:    '🚪',
  SEAT_SCAN:    '🪑',
  LED_UPDATE:   '💡',
  HEARTBEAT:    '📡',
  ESP32_ONLINE: '🟢',
  ESP32_OFFLINE:'🔴',
  RESYNC:       '🔄',
};

const EVENT_COLORS: Record<string, string> = {
  DOOR_SCAN:    '#f97316',
  SEAT_SCAN:    '#4ade80',
  LED_UPDATE:   '#60a5fa',
  HEARTBEAT:    '#6b7280',
  ESP32_ONLINE: '#4ade80',
  ESP32_OFFLINE:'#f87171',
  RESYNC:       '#a78bfa',
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

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
  AVAILABLE:   '0 0 8px 3px rgba(34,197,94,0.5)',
  RESERVED:    '0 0 10px 4px rgba(202,138,4,0.55)',
  BOOKED:      '0 0 10px 4px rgba(37,99,235,0.55)',
  OCCUPIED:    'none',
  CANCELLED:   '0 0 8px 3px rgba(34,197,94,0.5)',
  MAINTENANCE: 'none',
};

const inTransitGlow =
  '0 0 20px 8px rgba(251,146,60,0.9), 0 0 6px 2px rgba(251,146,60,1)';

// ─── LED seat dot ─────────────────────────────────────────────────────────────

interface LedSeatProps {
  seat: SeatInfo;
  inTransit: boolean;
  onHover: (seat: SeatInfo | null) => void;
}

const LedSeat: React.FC<LedSeatProps> = ({ seat, inTransit, onHover }) => {
  if (!seat.isActive) return <div style={{ width: 44, height: 44 }} />;

  const label  = `${seat.rowLabel}${seat.colNumber}`;
  const dimmed = !inTransit &&
    (seat.seatState === 'OCCUPIED' || seat.seatState === 'MAINTENANCE');

  return (
    <div
      className="relative flex items-center justify-center rounded-full select-none cursor-default"
      title={`${label} · ${inTransit ? 'IN TRANSIT' : seat.seatState}${seat.ledIndex != null ? ` · LED #${seat.ledIndex}` : ''}`}
      onMouseEnter={() => onHover(seat)}
      onMouseLeave={() => onHover(null)}
      style={{
        width: 44,
        height: 44,
        backgroundColor: inTransit ? '#f97316' : ledBg[seat.seatState],
        opacity: dimmed ? 0.2 : 1,
        boxShadow: inTransit
          ? inTransitGlow
          : dimmed ? 'none' : ledGlow[seat.seatState],
        transition: 'background-color 0.4s ease, box-shadow 0.4s ease, opacity 0.4s ease',
      }}
    >
      {/* In-transit: triple-ring blink — mirrors physical LED WHITE_PULSE */}
      {inTransit && (
        <>
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ backgroundColor: 'rgba(251,146,60,0.35)', animationDuration: '0.85s' }}
          />
          <span
            className="absolute inset-[-6px] rounded-full animate-ping"
            style={{ backgroundColor: 'rgba(251,146,60,0.15)', animationDuration: '0.85s', animationDelay: '0.28s' }}
          />
          {/* Blink overlay: simulates LED strip blinking */}
          <span
            className="absolute inset-0 rounded-full animate-led-blink"
            style={{ backgroundColor: '#f97316' }}
          />
        </>
      )}
      <span
        className="relative z-10 font-mono font-bold text-white"
        style={{ fontSize: '0.6rem', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
      >
        {label}
      </span>
      {seat.seatType === 'VIP' && (
        <span
          className="absolute font-bold text-yellow-300"
          style={{ fontSize: '0.5rem', top: 1, right: 2 }}
        >
          ★
        </span>
      )}
    </div>
  );
};

// ─── Seat detail card ─────────────────────────────────────────────────────────

interface SeatDetailProps { seat: SeatInfo; inTransit: boolean; }

const SeatDetail: React.FC<SeatDetailProps> = ({ seat, inTransit }) => (
  <div
    className="rounded-xl p-4 text-sm"
    style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}
  >
    <p className="font-mono font-bold text-white text-lg mb-2">
      {seat.rowLabel}{seat.colNumber}
    </p>
    <div className="flex flex-col gap-1.5">
      <DRow label="Type"      value={seat.seatType} />
      <DRow label="State"     value={inTransit ? '🟠 IN TRANSIT' : seat.seatState} />
      {seat.ledIndex != null && <DRow label="LED Index" value={`#${seat.ledIndex}`} />}
      <DRow label="Active"    value={seat.isActive ? 'Yes' : 'No'} />
    </div>
  </div>
);

const DRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex justify-between gap-4">
    <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>{label}</span>
    <span style={{ color: '#d1d5db', fontSize: '0.75rem', fontWeight: 600 }}>
      {value}
    </span>
  </div>
);

// ─── Event row ────────────────────────────────────────────────────────────────

const EventRow: React.FC<{ event: IoTEvent }> = ({ event }) => {
  const icon      = EVENT_ICONS[event.type] ?? '◆';
  const color     = EVENT_COLORS[event.type] ?? '#6b7280';
  const seatLabel = event.rowLabel && event.colNumber
    ? `${event.rowLabel}${event.colNumber}`
    : null;

  return (
    <div className="px-4 py-2.5 flex items-start gap-2.5 hover:bg-gray-900/40 transition-colors">
      <span style={{ fontSize: '0.9rem', flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold" style={{ color }}>
            {event.type.replace(/_/g, ' ')}
          </span>
          <span style={{ color: '#374151', fontSize: '0.65rem', flexShrink: 0 }}>
            {timeAgo(event.timestamp)}
          </span>
        </div>
        {seatLabel && (
          <p style={{ color: '#9ca3af', fontSize: '0.7rem', marginTop: '1px' }}>
            Seat <span className="font-mono font-bold">{seatLabel}</span>
            {event.bookingCode && (
              <> · <span className="font-mono">{event.bookingCode}</span></>
            )}
          </p>
        )}
        {event.message && !seatLabel && (
          <p
            style={{
              color: '#6b7280',
              fontSize: '0.7rem',
              marginTop: '1px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {event.message}
          </p>
        )}
      </div>
    </div>
  );
};

// ─── ESP32 detail row ─────────────────────────────────────────────────────────

const EspRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between gap-2">
    <span style={{ color: '#4b5563', fontSize: '0.72rem' }}>{label}</span>
    <span style={{ color: '#9ca3af', fontSize: '0.72rem', fontWeight: 500, textAlign: 'right' }}>
      {value}
    </span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * IoTMonitorPage — Staff-facing real-time visualisation of the physical
 * cinema hall LED strip.
 *
 * Design pattern: Observer — subscribes to two WebSocket topics and dispatches
 * Redux actions so all sibling components react without prop drilling.
 *
 * LED colour semantics (mirrors ESP32 firmware):
 *   Green  = AVAILABLE
 *   Yellow = RESERVED
 *   Blue   = BOOKED
 *   Amber  = IN TRANSIT (door scanned, walking to seat)
 *   Red    = OCCUPIED (LED dims out)
 *   Off    = MAINTENANCE
 */
export const IoTMonitorPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { seatMap, loading: seatLoading } = useSelector((s: RootState) => s.seats);
  const { events, inTransitSeatIds, esp32, resyncing } =
    useSelector((s: RootState) => s.iot);
  const { bookings } = useSelector((s: RootState) => s.admin);

  const [hoveredSeat, setHoveredSeat]         = useState<SeatInfo | null>(null);
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<number | null>(null);
  const [wsConnected, setWsConnected]         = useState(false);
  const [, setTick]                           = useState(0);

  // Refresh "X seconds ago" labels every 10 s
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  // Build unique showtime list from bookings for the selector
  const showtimeOptions = React.useMemo(() => {
    const seen = new Set<number>();
    return bookings
      .filter(b => { if (seen.has(b.showtimeId)) return false; seen.add(b.showtimeId); return true; })
      .map(b => ({
        id: b.showtimeId,
        label: `${b.movieTitle} · ${new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      }));
  }, [bookings]);

  useEffect(() => { dispatch(fetchAllBookings()); }, [dispatch]);

  useEffect(() => {
    if (!selectedShowtimeId && showtimeOptions.length > 0) {
      setSelectedShowtimeId(showtimeOptions[0].id);
    }
  }, [showtimeOptions, selectedShowtimeId]);

  useEffect(() => {
    if (selectedShowtimeId) {
      dispatch(clearSeatMap());
      dispatch(fetchSeatMap(selectedShowtimeId));
    }
    return () => { dispatch(clearSeatMap()); };
  }, [selectedShowtimeId, dispatch]);

  // WebSocket subscriptions
  const onSeatUpdate = useCallback((update: SeatWebSocketUpdate) => {
    dispatch(applySeatUpdate(update));
    if (update.seatState === 'OCCUPIED') dispatch(clearInTransit(update.seatId));
  }, [dispatch]);

  const onIoTEvent = useCallback((event: IoTEvent) => {
    dispatch(receiveEvent(event));
    if (event.type === 'DOOR_SCAN' && event.seatId != null) {
      dispatch(markInTransit([event.seatId]));
    }
  }, [dispatch]);

  useEffect(() => {
    if (!selectedShowtimeId) return;
    wsService.connect()
      .then(() => {
        setWsConnected(true);
        wsService.subscribeSeatMap(selectedShowtimeId, onSeatUpdate);
        wsService.subscribeIoTEvents(selectedShowtimeId, onIoTEvent);
      })
      .catch(() => setWsConnected(false));
    return () => { wsService.disconnect(); setWsConnected(false); };
  }, [selectedShowtimeId, onSeatUpdate, onIoTEvent]);

  // Row grouping
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
  const stats = React.useMemo(() => {
    if (!seatMap) return null;
    const active = seatMap.seats.filter(s => s.isActive);
    return {
      total:     active.length,
      available: active.filter(s => s.seatState === 'AVAILABLE' || s.seatState === 'CANCELLED').length,
      reserved:  active.filter(s => s.seatState === 'RESERVED').length,
      booked:    active.filter(s => s.seatState === 'BOOKED').length,
      occupied:  active.filter(s => s.seatState === 'OCCUPIED').length,
      inTransit: inTransitSeatIds.length,
    };
  }, [seatMap, inTransitSeatIds]);

  const handleResync = () => {
    if (seatMap?.screenId) dispatch(triggerResync(seatMap.screenId));
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
      <Header />
      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-6 overflow-hidden" style={{ minWidth: 0 }}>

          {/* ── Top bar ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                IoT Monitor
                <span
                  className="ml-3 text-xs font-mono px-2 py-0.5 rounded"
                  style={{ backgroundColor: 'rgba(220,38,38,0.15)', color: '#f87171' }}
                >
                  LED Strip
                </span>
              </h1>
              <p style={{ color: '#4b5563', fontSize: '0.75rem', marginTop: '2px' }}>
                Real-time physical seat &amp; LED visualisation
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {showtimeOptions.length > 0 && (
                <select
                  value={selectedShowtimeId ?? ''}
                  onChange={e => setSelectedShowtimeId(Number(e.target.value))}
                  className="text-sm rounded-lg px-3 py-2 font-medium focus:outline-none"
                  style={{
                    backgroundColor: '#111827',
                    border: '1px solid #1f2937',
                    color: '#d1d5db',
                  }}
                >
                  {showtimeOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              )}

              {/* WS status pill */}
              <span
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium"
                style={{
                  backgroundColor: wsConnected
                    ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: wsConnected ? '#4ade80' : '#f87171',
                  border: `1px solid ${wsConnected
                    ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{
                    backgroundColor: wsConnected ? '#4ade80' : '#f87171',
                    boxShadow: wsConnected ? '0 0 5px #4ade80' : 'none',
                  }}
                />
                {wsConnected ? 'WS Live' : 'WS Off'}
              </span>

              <Button size="sm" variant="ghost" loading={resyncing}
                onClick={handleResync} disabled={!seatMap}>
                ↺ Resync LEDs
              </Button>

              <Button size="sm" variant="ghost"
                onClick={() => dispatch(clearEvents())}>
                Clear Log
              </Button>
            </div>
          </div>

          {/* ── In-transit alert banner ────────────────────────────── */}
          {inTransitSeatIds.length > 0 && (
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4 animate-slide-up"
              style={{
                backgroundColor: 'rgba(251,146,60,0.07)',
                border: '1px solid rgba(251,146,60,0.3)',
                boxShadow: '0 0 24px rgba(251,146,60,0.08)',
              }}
            >
              <div className="relative flex-shrink-0">
                <div
                  className="w-4 h-4 rounded-full animate-led-blink"
                  style={{ backgroundColor: '#f97316' }}
                />
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ backgroundColor: 'rgba(249,115,22,0.4)', animationDuration: '0.85s' }}
                />
              </div>
              <div className="flex-1">
                <p style={{ color: '#fb923c', fontSize: '0.8rem', fontWeight: 700 }}>
                  {inTransitSeatIds.length} seat{inTransitSeatIds.length > 1 ? 's' : ''} blinking — customer{inTransitSeatIds.length > 1 ? 's' : ''} in transit
                </p>
                <p style={{ color: '#78350f', fontSize: '0.68rem', marginTop: '1px' }}>
                  LED strip is in WHITE_PULSE mode — guiding to seat
                </p>
              </div>
              <span
                className="text-xs font-mono px-2 py-1 rounded-full font-bold"
                style={{ backgroundColor: 'rgba(251,146,60,0.15)', color: '#fb923c' }}
              >
                {inTransitSeatIds.length}
              </span>
            </div>
          )}

          {/* ── Stats bar ──────────────────────────────────────────── */}
          {stats && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
              {([
                { label: 'Total',      value: stats.total,     color: '#9ca3af', glow: false },
                { label: 'Available',  value: stats.available, color: '#4ade80', glow: false },
                { label: 'Reserved',   value: stats.reserved,  color: '#facc15', glow: false },
                { label: 'Booked',     value: stats.booked,    color: '#60a5fa', glow: false },
                { label: 'In Transit', value: stats.inTransit, color: '#fb923c', glow: stats.inTransit > 0 },
                { label: 'Occupied',   value: stats.occupied,  color: '#f87171', glow: false },
              ] as const).map(s => (
                <div
                  key={s.label}
                  className="rounded-lg p-3 text-center"
                  style={{
                    backgroundColor: '#0d1117',
                    border: `1px solid ${s.glow ? 'rgba(251,146,60,0.3)' : '#1f2937'}`,
                    boxShadow: s.glow ? '0 0 12px rgba(251,146,60,0.15)' : 'none',
                  }}
                >
                  <p className="text-xl font-bold font-mono"
                    style={{ color: s.color }}>{s.value}</p>
                  <p style={{ color: '#4b5563', fontSize: '0.65rem', marginTop: '1px' }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ── Main panels ─────────────────────────────────────────── */}
          <div className="flex gap-4" style={{ minHeight: 0 }}>

            {/* LED hall visualisation */}
            <div
              className="flex-1 rounded-2xl p-6 overflow-auto"
              style={{
                backgroundColor: '#0d1117',
                border: '1px solid #1f2937',
                boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5)',
                minWidth: 0,
              }}
            >
              {/* Screen bar */}
              <div className="flex flex-col items-center mb-6">
                <div
                  className="rounded-sm mb-2"
                  style={{
                    width: '55%', height: '3px',
                    background:
                      'linear-gradient(to right, transparent, #dc2626 30%, #ef4444 50%, #dc2626 70%, transparent)',
                    boxShadow: '0 0 12px 4px rgba(220,38,38,0.5)',
                  }}
                />
                <p
                  className="tracking-widest uppercase font-mono"
                  style={{ color: '#374151', fontSize: '0.6rem', letterSpacing: '0.3em' }}
                >
                  screen
                </p>
              </div>

              {seatLoading ? (
                <div className="flex justify-center py-12">
                  <Loading message="Loading seat map…" />
                </div>
              ) : seatMap ? (
                <>
                  <div className="flex flex-col items-center gap-3">
                    {rowLabels.map(row => (
                      <div key={row} className="flex items-center gap-3">
                        <span
                          className="font-mono text-right select-none"
                          style={{ width: '1.2rem', fontSize: '0.7rem', color: '#374151' }}
                        >
                          {row}
                        </span>
                        <div className="flex gap-2 flex-wrap">
                          {rows[row]
                            .sort((a, b) => a.colNumber - b.colNumber)
                            .map(seat => (
                              <LedSeat
                                key={seat.seatId}
                                seat={seat}
                                inTransit={inTransitSeatIds.includes(seat.seatId)}
                                onHover={setHoveredSeat}
                              />
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {hoveredSeat && (
                    <div className="mt-6 max-w-xs mx-auto">
                      <SeatDetail
                        seat={hoveredSeat}
                        inTransit={inTransitSeatIds.includes(hoveredSeat.seatId)}
                      />
                    </div>
                  )}

                  <div className="mt-6 border-t" style={{ borderColor: '#1f2937' }}>
                    <SeatLegend iotMode />
                  </div>

                  <p className="text-center mt-2"
                    style={{ color: '#1f2937', fontSize: '0.65rem' }}>
                    {seatMap.screenName} · {seatMap.totalSeats} seats · LED indexed
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <p style={{ color: '#374151', fontSize: '0.85rem' }}>
                    Select a showtime to load the hall
                  </p>
                </div>
              )}
            </div>

            {/* Right panel */}
            <div className="flex flex-col gap-4" style={{ width: '300px', flexShrink: 0 }}>

              {/* ESP32 status */}
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor: '#0d1117',
                  border: `1px solid ${esp32.online
                    ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)'}`,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-white">ESP32 Device</span>
                  <span
                    className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: esp32.online
                        ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: esp32.online ? '#4ade80' : '#f87171',
                    }}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${esp32.online ? 'animate-pulse' : ''}`}
                      style={{
                        backgroundColor: esp32.online ? '#4ade80' : '#f87171',
                        boxShadow: esp32.online ? '0 0 5px #4ade80' : 'none',
                      }}
                    />
                    {esp32.online ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <EspRow label="Protocol"  value="MQTT / Mosquitto" />
                  <EspRow label="LEDs"
                    value={esp32.ledCount > 0 ? `${esp32.ledCount} × WS2812B` : 'Not reported'} />
                  <EspRow label="Last ping"
                    value={esp32.lastHeartbeat ? fmtTime(esp32.lastHeartbeat) : '—'} />
                  {esp32.screenId != null && (
                    <EspRow label="Screen ID" value={`#${esp32.screenId}`} />
                  )}
                </div>
              </div>

              {/* Live activity feed */}
              <div
                className="flex-1 rounded-xl overflow-hidden flex flex-col"
                style={{
                  backgroundColor: '#0d1117',
                  border: '1px solid #1f2937',
                  minHeight: 0,
                }}
              >
                <div
                  className="px-4 py-3 border-b flex items-center justify-between"
                  style={{ borderColor: '#1f2937' }}
                >
                  <span className="text-sm font-semibold text-white">Live Activity</span>
                  {events.length > 0 && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-mono"
                      style={{ backgroundColor: '#1f2937', color: '#6b7280' }}
                    >
                      {events.length}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto" style={{ maxHeight: '420px' }}>
                  {events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <span style={{ color: '#1f2937', fontSize: '1.5rem' }}>◎</span>
                      <p style={{ color: '#374151', fontSize: '0.75rem' }}>
                        Waiting for events…
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y" style={{ borderColor: '#111827' }}>
                      {events.map((ev: IoTEvent, i: number) => (
                        <EventRow key={ev.id || String(i)} event={ev} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};