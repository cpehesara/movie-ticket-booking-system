import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchSeatMap, clearSeatMap } from '../../../viewmodel/slices/seatSlice';
import { useWebSocket } from '../../../viewmodel/hooks/useWebSocket';
import { SeatInfo, SeatState } from '../../../model/types/seat.types';
import { Loading } from '../../components/common/Loading';

const stateColor: Record<SeatState, string> = {
  AVAILABLE:   'bg-green-600',
  RESERVED:    'bg-yellow-500',
  BOOKED:      'bg-blue-600',
  OCCUPIED:    'bg-red-600',
  CANCELLED:   'bg-green-600',
  MAINTENANCE: 'bg-gray-600',
};

export const HallDisplayPage: React.FC = () => {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const id = Number(showtimeId);
  const dispatch = useDispatch<AppDispatch>();
  const { seatMap, loading } = useSelector((s: RootState) => s.seats);

  useWebSocket(id);

  useEffect(() => {
    dispatch(fetchSeatMap(id));
    const interval = setInterval(() => dispatch(fetchSeatMap(id)), 30000);
    return () => { clearInterval(interval); dispatch(clearSeatMap()); };
  }, [id, dispatch]);

  const rows = seatMap?.seats.reduce<Record<string, SeatInfo[]>>(
    (acc: Record<string, SeatInfo[]>, seat: SeatInfo) => {
      if (!acc[seat.rowLabel]) acc[seat.rowLabel] = [];
      acc[seat.rowLabel].push(seat);
      return acc;
    },
    {}
  ) ?? {};

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-black text-red-500 tracking-widest mb-2">🎬 CinePlex</h1>
      {seatMap && <p className="text-gray-400 text-lg mb-2">{seatMap.screenName}</p>}

      <div className="flex items-center gap-6 mb-8 text-sm">
        {[
          { color: 'bg-green-600', label: 'Available' },
          { color: 'bg-yellow-500', label: 'Reserved' },
          { color: 'bg-blue-600', label: 'Booked' },
          { color: 'bg-red-600', label: 'Occupied' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${color}`} />
            <span className="text-gray-400">{label}</span>
          </div>
        ))}
        {seatMap && (
          <span className="text-green-400 font-semibold ml-4">
            {seatMap.availableCount} / {seatMap.totalSeats} available
          </span>
        )}
      </div>

      {loading ? <Loading message="Loading seat map..." /> : (
        <>
          <div className="w-2/3 h-3 bg-gradient-to-r from-transparent via-red-500 to-transparent
            rounded-full mb-8 opacity-60" />
          <p className="text-gray-600 text-xs tracking-widest uppercase mb-6">SCREEN</p>

          <div className="flex flex-col items-center gap-3">
            {Object.keys(rows).sort().map((row: string) => (
              <div key={row} className="flex items-center gap-2">
                <span className="w-8 text-center text-gray-600 font-mono text-sm">{row}</span>
                <div className="flex gap-2">
                  {rows[row]
                    .sort((a: SeatInfo, b: SeatInfo) => a.colNumber - b.colNumber)
                    .map((seat: SeatInfo) => (
                      <div
                        key={seat.seatId}
                        title={`${seat.rowLabel}${seat.colNumber} — ${seat.seatState}`}
                        className={`w-10 h-10 rounded transition-all duration-700
                          ${seat.isActive ? stateColor[seat.seatState] : 'bg-transparent'}
                          ${seat.seatState === 'OCCUPIED' ? 'animate-pulse' : ''}
                        `}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-gray-800 text-xs mt-12">Live seat map — updates in real time</p>
    </div>
  );
};