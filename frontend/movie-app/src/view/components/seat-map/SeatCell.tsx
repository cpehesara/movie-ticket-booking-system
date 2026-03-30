import React from 'react';
import { SeatInfo, SeatState } from '../../../model/types/seat.types';

interface SeatCellProps {
  seat: SeatInfo;
  selected: boolean;
  onSelect: (seatId: number) => void;
}

const stateConfig: Record<SeatState, { bg: string; label: string; selectable: boolean }> = {
  AVAILABLE:   { bg: 'bg-green-600 hover:bg-green-500 cursor-pointer', label: 'Available', selectable: true },
  RESERVED:    { bg: 'bg-yellow-500 cursor-not-allowed', label: 'Reserved', selectable: false },
  BOOKED:      { bg: 'bg-blue-600 cursor-not-allowed', label: 'Booked', selectable: false },
  OCCUPIED:    { bg: 'bg-red-600 cursor-not-allowed', label: 'Occupied', selectable: false },
  CANCELLED:   { bg: 'bg-green-600 hover:bg-green-500 cursor-pointer', label: 'Available', selectable: true },
  MAINTENANCE: { bg: 'bg-gray-600 cursor-not-allowed', label: 'Maintenance', selectable: false },
};

export const SeatCell: React.FC<SeatCellProps> = ({ seat, selected, onSelect }) => {
  if (!seat.isActive) {
    return <div className="w-8 h-8 rounded bg-transparent" />;
  }

  const config = stateConfig[seat.seatState];
  const isSelected = selected && config.selectable;

  return (
    <button
      title={`${seat.rowLabel}${seat.colNumber} — ${config.label} — ${seat.seatType}`}
      disabled={!config.selectable}
      onClick={() => config.selectable && onSelect(seat.seatId)}
      className={`
        w-8 h-8 rounded text-xs font-bold transition-all duration-150
        ${config.bg}
        ${isSelected ? 'ring-2 ring-white scale-110' : ''}
        ${seat.seatType === 'VIP' ? 'rounded-t-2xl' : ''}
        ${seat.seatType === 'COUPLE' ? 'w-16' : ''}
        ${seat.seatType === 'WHEELCHAIR' ? 'opacity-80' : ''}
      `}
    >
      {seat.seatType === 'VIP' ? '★' : seat.seatType === 'WHEELCHAIR' ? '♿' : ''}
    </button>
  );
};