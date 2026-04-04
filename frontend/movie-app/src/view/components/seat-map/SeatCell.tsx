// SeatCell.tsx — updated to handle GUIDING state with pulsing animation

import React from 'react';
import { SeatInfo, SeatState } from '../../../model/types/seat.types';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { toggleSeatSelection } from '../../../viewmodel/slices/seatSlice';

// ── State → visual style mapping ─────────────────────────────────────────────

const stateBg: Record<SeatState, string> = {
  AVAILABLE:   'bg-green-600 hover:bg-green-500 cursor-pointer',
  RESERVED:    'bg-yellow-500 cursor-not-allowed opacity-80',
  BOOKED:      'bg-blue-600 cursor-not-allowed',
  GUIDING:     'bg-orange-400 animate-pulse cursor-not-allowed',  // blinking — customer walking
  OCCUPIED:    'bg-gray-700 cursor-not-allowed',
  CANCELLED:   'bg-green-600 hover:bg-green-500 cursor-pointer',
  MAINTENANCE: 'bg-gray-600 cursor-not-allowed opacity-50',
};

const stateLabel: Record<SeatState, string> = {
  AVAILABLE:   'Available',
  RESERVED:    'Reserved',
  BOOKED:      'Booked',
  GUIDING:     'Guiding...',
  OCCUPIED:    'Occupied',
  CANCELLED:   'Available',
  MAINTENANCE: 'Maintenance',
};

// ── Component ─────────────────────────────────────────────────────────────────

interface SeatCellProps {
  seat:       SeatInfo;
  selectable: boolean;
}

export const SeatCell: React.FC<SeatCellProps> = ({ seat, selectable }) => {
  const dispatch    = useDispatch<AppDispatch>();
  const selectedIds = useSelector((s: RootState) => s.seats.selectedSeatIds);
  const isSelected  = selectedIds.includes(seat.seatId);

  const isClickable = selectable
    && (seat.seatState === 'AVAILABLE' || seat.seatState === 'CANCELLED')
    && seat.isActive;

  const handleClick = () => {
    if (isClickable) dispatch(toggleSeatSelection(seat.seatId));
  };

  const bgClass = !seat.isActive
    ? 'bg-transparent cursor-default'
    : isSelected
      ? 'bg-red-500 hover:bg-red-400 cursor-pointer ring-2 ring-red-300'
      : stateBg[seat.seatState];

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      title={`${seat.rowLabel}${seat.colNumber} — ${stateLabel[seat.seatState]}${
        seat.ledIndex != null ? ` (LED #${seat.ledIndex})` : ''
      }`}
      onClick={handleClick}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      className={`
        w-9 h-9 rounded-md text-xs font-bold flex items-center justify-center
        transition-all duration-300 select-none
        ${bgClass}
      `}
    >
      {seat.isActive ? (
        <span className={`text-white text-[10px] leading-none ${
          seat.seatState === 'GUIDING' ? 'animate-bounce' : ''
        }`}>
          {seat.rowLabel}{seat.colNumber}
        </span>
      ) : null}
    </div>
  );
};