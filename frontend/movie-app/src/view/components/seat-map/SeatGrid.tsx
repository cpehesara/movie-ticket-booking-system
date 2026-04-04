import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../viewmodel/store';
import { toggleSeatSelection } from '../../../viewmodel/slices/seatSlice';
import { SeatCell } from './SeatCell';
import { SeatInfo } from '../../../model/types/seat.types';

interface SeatGridProps {
  /**
   * iotMode — renders LED indicators instead of booking buttons.
   * Used on HallDisplayPage and IoTMonitorPage.
   */
  iotMode?: boolean;
  /**
   * inTransitSeatIds — seats where customer has scanned at door
   * but has not yet arrived at physical seat. Shown with amber pulse.
   */
  inTransitSeatIds?: number[];
}

export const SeatGrid: React.FC<SeatGridProps> = ({
  iotMode = false,
  inTransitSeatIds = [],
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { seatMap, selectedSeatIds } = useSelector((s: RootState) => s.seats);

  if (!seatMap) return null;

  // Group seats by row label, sort columns numerically
  const rows = seatMap.seats.reduce<Record<string, SeatInfo[]>>((acc, seat) => {
    if (!acc[seat.rowLabel]) acc[seat.rowLabel] = [];
    acc[seat.rowLabel].push(seat);
    return acc;
  }, {});

  const rowLabels = Object.keys(rows).sort();

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Screen indicator */}
      <div
        className="mb-1 rounded-sm opacity-70"
        style={{
          width: '60%',
          height: iotMode ? '4px' : '6px',
          background: 'linear-gradient(to right, transparent, #dc2626, transparent)',
        }}
      />
      <p
        className="mb-3 tracking-widest uppercase"
        style={{ fontSize: '0.65rem', color: '#4b5563', letterSpacing: '0.25em' }}
      >
        Screen
      </p>

      {/* Seat rows */}
      <div className="flex flex-col gap-2">
        {rowLabels.map(row => (
          <div key={row} className="flex items-center gap-2">
            {/* Row label */}
            <span
              className="font-mono text-center select-none"
              style={{
                width: '1.5rem',
                fontSize: '0.7rem',
                color: '#6b7280',
              }}
            >
              {row}
            </span>

            {/* Seats */}
            <div className="flex gap-1.5 flex-wrap">
              {rows[row]
                .sort((a, b) => a.colNumber - b.colNumber)
                .map(seat => (
                  <SeatCell
                    key={seat.seatId}
                    seat={seat}
                    selectable={!iotMode}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};