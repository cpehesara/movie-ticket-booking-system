import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchSeatMap, clearSeatMap } from '../../../viewmodel/slices/seatSlice';
import { useWebSocket } from '../../../viewmodel/hooks/useWebSocket';
import { SeatInfo, SeatState } from '../../../model/types/seat.types';
import { Loading } from '../../components/common/Loading';

// ── State → visual mapping ────────────────────────────────────────────────────

const stateColor: Record<SeatState, string> = {
  AVAILABLE:   'bg-green-600',
  RESERVED:    'bg-yellow-500',
  BOOKED:      'bg-blue-600',
  GUIDING:     'bg-orange-400 animate-pulse',  // LED blinking — customer en route
  OCCUPIED:    'bg-gray-700',
  CANCELLED:   'bg-green-600',
  MAINTENANCE: 'bg-gray-600 opacity-40',
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * HallDisplayPage — read-only real-time seat map shown on lobby/hall TV screens.
 *
 * CHANGE: Added GUIDING state display with orange pulsing animation so staff
 * watching the display board can see which customers are currently walking
 * to their seats (LED blinking on hardware, pulsing orange on screen).
 *
 * Also added seat count breakdown including GUIDING count.
 */
export const HallDisplayPage: React.FC = () => {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const id = Number(showtimeId);
  const dispatch = useDispatch<AppDispatch>();
  const { seatMap, loading } = useSelector((s: RootState) => s.seats);

  useWebSocket(id);

  useEffect(() => {
    dispatch(fetchSeatMap(id));
    // Polling fallback every 30s in case WebSocket drops
    const interval = setInterval(() => dispatch(fetchSeatMap(id)), 30000);
    return () => { clearInterval(interval); dispatch(clearSeatMap()); };
  }, [id, dispatch]);

  // Group seats by row
  const rows = seatMap?.seats.reduce<Record<string, SeatInfo[]>>(
    (acc, seat) => {
      if (!acc[seat.rowLabel]) acc[seat.rowLabel] = [];
      acc[seat.rowLabel].push(seat);
      return acc;
    },
    {}
  ) ?? {};

  // Counts
  const guidingCount  = seatMap?.seats.filter(s => s.seatState === 'GUIDING').length  ?? 0;
  const occupiedCount = seatMap?.seats.filter(s => s.seatState === 'OCCUPIED').length ?? 0;
  const bookedCount   = seatMap?.seats.filter(s => s.seatState === 'BOOKED').length   ?? 0;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">

      {/* Brand */}
      <h1 className="text-5xl font-black text-red-500 tracking-widest mb-1">🎬 CinePlex</h1>
      {seatMap && (
        <p className="text-gray-500 text-xl mb-2 tracking-wide">{seatMap.screenName}</p>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 mb-4 text-sm flex-wrap justify-center">
        {[
          { color: 'bg-green-600',                      label: 'Available' },
          { color: 'bg-yellow-500',                     label: 'Reserved'  },
          { color: 'bg-blue-600',                       label: 'Booked'    },
          { color: 'bg-orange-400 animate-pulse',       label: 'Guiding 💡'},
          { color: 'bg-gray-700',                       label: 'Occupied'  },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${color}`} />
            <span className="text-gray-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Live counts */}
      {seatMap && (
        <div className="flex gap-6 mb-6 text-sm">
          <span className="text-green-400 font-semibold">
            {seatMap.availableCount} available
          </span>
          <span className="text-blue-400">{bookedCount} booked</span>
          {guidingCount > 0 && (
            <span className="text-orange-400 font-semibold animate-pulse">
              {guidingCount} walking to seat
            </span>
          )}
          <span className="text-gray-500">{occupiedCount} seated</span>
        </div>
      )}

      {loading ? (
        <Loading message="Loading seat map..." />
      ) : (
        <>
          {/* Screen representation */}
          <div className="w-2/3 h-3 bg-gradient-to-r from-transparent via-red-500 to-transparent
            rounded-full mb-8 opacity-60" />
          <p className="text-gray-700 text-xs tracking-widest uppercase mb-6">SCREEN</p>

          {/* Seat grid */}
          <div className="flex flex-col items-center gap-3">
            {Object.keys(rows).sort().map(row => (
              <div key={row} className="flex items-center gap-2">
                <span className="w-8 text-center text-gray-600 font-mono text-sm">{row}</span>
                <div className="flex gap-2">
                  {rows[row]
                    .sort((a, b) => a.colNumber - b.colNumber)
                    .map(seat => (
                      <div
                        key={seat.seatId}
                        title={`${seat.rowLabel}${seat.colNumber} — ${seat.seatState}`}
                        className={`
                          w-10 h-10 rounded transition-all duration-700 flex items-center
                          justify-center text-xs text-white/60 font-mono
                          ${seat.isActive
                            ? stateColor[seat.seatState]
                            : 'bg-transparent'}
                        `}
                      >
                        {seat.colNumber}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-gray-800 text-xs mt-12">
        Live seat map — updates in real-time
      </p>
    </div>
  );
};