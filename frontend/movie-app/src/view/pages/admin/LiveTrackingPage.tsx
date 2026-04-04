import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminApi } from '../../../model/api/adminApi';
import { wsService } from '../../../model/services/webSocketService';
import { TrackingEvent } from '../../../model/types/tracking.types';
import { BookingResponse, BookedSeatInfo } from '../../../model/types/booking.types';
import { Loading } from '../../components/common/Loading';

// ── Local types ──────────────────────────────────────────────────────────────

interface TrackingRow {
  id: string;            // unique key for React
  bookingCode: string;
  customerName: string;
  seats: string[];
  doorScannedAt: string | null;
  seatedAt: string | null;
  seatedSeat: string | null;
  status: 'DOOR_SCANNED' | 'SEATED';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(isoStr: string | null): string {
  if (!isoStr) return '—';
  try {
    return new Date(isoStr).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch { return isoStr; }
}

function seedFromSnapshot(bookings: BookingResponse[]): Map<string, TrackingRow> {
  const map = new Map<string, TrackingRow>();
  for (const b of bookings) {
    const seats = b.seats.map((s: BookedSeatInfo) => `${s.rowLabel}${s.colNumber}`);
    const isCompleted = b.status === 'COMPLETED';
    map.set(b.bookingCode, {
      id:             b.bookingCode,
      bookingCode:    b.bookingCode,
      customerName:   '—',        // snapshot doesn't include name; WS event will fill it
      seats,
      doorScannedAt:  b.checkedInAt,
      seatedAt:       isCompleted ? b.checkedInAt : null,
      seatedSeat:     null,
      status:         isCompleted ? 'SEATED' : 'DOOR_SCANNED',
    });
  }
  return map;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * LiveTrackingPage — real-time staff view of customer seating progress.
 *
 * Shows a live feed that answers the question:
 *   "Has this customer made it to their seat yet?"
 *
 * DATA SOURCES:
 *   1. Initial load: GET /api/admin/tracking/{showtimeId}/snapshot
 *      Populates the table with customers already checked in.
 *   2. Real-time updates: WebSocket /topic/tracking/{showtimeId}
 *      DOOR_SCANNED → adds or updates row, shows blinking LED indicator
 *      SEATED       → updates row to show confirmed, LED off indicator
 *
 * COLUMN MEANINGS:
 *   Customer   — full name
 *   Booking    — booking code (monospace)
 *   Seats      — seat labels assigned in this booking
 *   Door Scan  — timestamp of entrance QR scan (Step 1)
 *   Seated At  — timestamp of seat QR confirmation (Step 2)
 *   Status     — LED indicator: blinking = guiding, green = seated
 */
export const LiveTrackingPage: React.FC = () => {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const id = Number(showtimeId);

  const [rows, setRows]         = useState<Map<string, TrackingRow>>(new Map());
  const [loading, setLoading]   = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [eventLog, setEventLog] = useState<{ text: string; type: 'door' | 'seated' }[]>([]);

  const unsubRef = useRef<(() => void) | null>(null);

  // ── Load snapshot on mount ───────────────────────────────────────────────
  useEffect(() => {
    adminApi.getTrackingSnapshot(id)
      .then(bookings => {
        setRows(seedFromSnapshot(bookings));
      })
      .catch(() => {}) // silently fail; WS events will populate the table
      .finally(() => setLoading(false));
  }, [id]);

  // ── Connect WebSocket and subscribe to tracking topic ────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        if (!wsService.isConnected()) await wsService.connect();
        setWsConnected(true);

        unsubRef.current = wsService.subscribeTracking(id, (event: TrackingEvent) => {
          handleTrackingEvent(event);
        });
      } catch {
        setWsConnected(false);
      }
    };

    init();
    return () => { unsubRef.current?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Handle incoming tracking events ─────────────────────────────────────
  const handleTrackingEvent = (event: TrackingEvent) => {
    setRows(prev => {
      const next = new Map(prev);
      const existing = next.get(event.bookingCode);

      if (event.eventType === 'DOOR_SCANNED') {
        next.set(event.bookingCode, {
          id:           event.bookingCode,
          bookingCode:  event.bookingCode,
          customerName: event.customerName,
          seats:        event.seats,
          doorScannedAt: event.timestamp,
          seatedAt:     existing?.seatedAt ?? null,
          seatedSeat:   existing?.seatedSeat ?? null,
          status:       'DOOR_SCANNED',
        });
      } else if (event.eventType === 'SEATED') {
        next.set(event.bookingCode, {
          ...(existing ?? {
            id:           event.bookingCode,
            bookingCode:  event.bookingCode,
            customerName: event.customerName,
            seats:        event.seats,
            doorScannedAt: null,
          }),
          customerName: event.customerName,
          seatedAt:     event.timestamp,
          seatedSeat:   event.seatLabel,
          status:       'SEATED',
        });
      }

      return next;
    });

    // Add to activity log (keep last 20)
    const logText = event.eventType === 'DOOR_SCANNED'
      ? `${event.customerName} scanned entrance QR — heading to ${event.seats.join(', ')}`
      : `${event.customerName} confirmed at seat ${event.seatLabel ?? '—'}`;

    setEventLog(prev => [
      { text: logText, type: event.eventType === 'DOOR_SCANNED' ? 'door' : 'seated' },
      ...prev.slice(0, 19),
    ]);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const rowArray = Array.from(rows.values()).sort((a, b) => {
    // DOOR_SCANNED first (not yet seated), then SEATED
    if (a.status === b.status) return 0;
    return a.status === 'DOOR_SCANNED' ? -1 : 1;
  });

  const guidingCount = rowArray.filter(r => r.status === 'DOOR_SCANNED').length;
  const seatedCount  = rowArray.filter(r => r.status === 'SEATED').length;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🎬 Live Seat Tracking</h1>
          <p className="text-gray-500 text-sm">Showtime #{id} — real-time customer seating progress</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full
            ${wsConnected ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            {wsConnected ? 'LIVE' : 'Disconnected'}
          </div>
          <Link to="/admin"
            className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
            ← Admin
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Total Tracked</p>
          <p className="text-3xl font-bold text-white">{rowArray.length}</p>
        </div>
        <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-4">
          <p className="text-yellow-500 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
            Walking to Seat
          </p>
          <p className="text-3xl font-bold text-yellow-300">{guidingCount}</p>
        </div>
        <div className="bg-green-950 border border-green-800 rounded-xl p-4">
          <p className="text-green-500 text-xs uppercase tracking-wider mb-1">Seated ✓</p>
          <p className="text-3xl font-bold text-green-300">{seatedCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Main tracking table */}
        <div className="xl:col-span-2">
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white text-sm">Customer Status</h2>
            </div>

            {loading ? (
              <div className="p-8"><Loading message="Loading..." /></div>
            ) : rowArray.length === 0 ? (
              <div className="p-12 text-center text-gray-600">
                <p className="text-4xl mb-3">🚪</p>
                <p>Waiting for customers to scan entrance QR...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-left">Booking</th>
                      <th className="px-4 py-3 text-left">Seats</th>
                      <th className="px-4 py-3 text-left">Door Scan</th>
                      <th className="px-4 py-3 text-left">Seated At</th>
                      <th className="px-4 py-3 text-center">LED Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowArray.map(row => (
                      <tr key={row.id}
                        className={`border-b border-gray-800/50 transition-colors
                          ${row.status === 'DOOR_SCANNED'
                            ? 'bg-yellow-950/20 hover:bg-yellow-950/40'
                            : 'bg-green-950/10 hover:bg-green-950/20'}`}>
                        <td className="px-4 py-3">
                          <span className="text-white font-medium">{row.customerName || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-400">{row.bookingCode}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {row.seats.map(s => (
                              <span key={s}
                                className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded font-mono">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs tabular-nums">
                          {formatTime(row.doorScannedAt)}
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums">
                          {row.seatedAt
                            ? <span className="text-green-400">{formatTime(row.seatedAt)}</span>
                            : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.status === 'DOOR_SCANNED' ? (
                            /* Blinking LED indicator — mirrors the physical LED */
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-yellow-400 animate-ping" />
                              <span className="text-yellow-400 text-xs">GUIDING</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-400" />
                              <span className="text-green-400 text-xs">OFF ✓</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Activity log */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="font-semibold text-white text-sm">Activity Log</h2>
            <p className="text-gray-600 text-xs">Latest events, newest first</p>
          </div>

          <div className="divide-y divide-gray-800/50 max-h-[500px] overflow-y-auto">
            {eventLog.length === 0 ? (
              <div className="p-6 text-gray-700 text-sm text-center">
                No events yet
              </div>
            ) : (
              eventLog.map((entry, i) => (
                <div key={i} className={`px-4 py-3 flex items-start gap-3
                  ${entry.type === 'door' ? 'bg-yellow-950/10' : 'bg-green-950/10'}`}>
                  <span className="text-lg mt-0.5">
                    {entry.type === 'door' ? '🚪' : '✅'}
                  </span>
                  <p className="text-xs text-gray-300 leading-relaxed">{entry.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <p className="text-gray-800 text-xs text-center mt-8">
        Staff tracking view — updates in real-time via WebSocket
      </p>
    </div>
  );
};