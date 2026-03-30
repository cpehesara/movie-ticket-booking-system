import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../viewmodel/store';
import { toggleSeatSelection } from '../../../viewmodel/slices/seatSlice';
import { SeatCell } from './SeatCell';
import { SeatInfo } from '../../../model/types/seat.types';

export const SeatGrid: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { seatMap, selectedSeatIds } = useSelector((s: RootState) => s.seats);

  if (!seatMap) return null;

  const rows = seatMap.seats.reduce<Record<string, SeatInfo[]>>(
    (acc: Record<string, SeatInfo[]>, seat: SeatInfo) => {
      if (!acc[seat.rowLabel]) acc[seat.rowLabel] = [];
      acc[seat.rowLabel].push(seat);
      return acc;
    },
    {}
  );

  const rowLabels = Object.keys(rows).sort();

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-3/4 h-2 bg-gradient-to-r from-transparent via-red-500 to-transparent
        rounded-full mb-4 opacity-70" />
      <p className="text-gray-500 text-xs mb-4 tracking-widest uppercase">Screen</p>

      {rowLabels.map((row) => (
        <div key={row} className="flex items-center gap-2">
          <span className="w-6 text-center text-gray-500 text-xs font-mono">{row}</span>
          <div className="flex gap-1.5">
            {rows[row]
              .sort((a: SeatInfo, b: SeatInfo) => a.colNumber - b.colNumber)
              .map((seat: SeatInfo) => (
                <SeatCell
                  key={seat.seatId}
                  seat={seat}
                  selected={selectedSeatIds.includes(seat.seatId)}
                  onSelect={(id: number) => dispatch(toggleSeatSelection(id))}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};