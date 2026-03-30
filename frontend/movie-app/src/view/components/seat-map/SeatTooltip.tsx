import React, { useState } from 'react';
import { SeatInfo } from '../../../model/types/seat.types';

interface SeatTooltipProps {
  seat: SeatInfo;
  basePrice: number;
  children: React.ReactNode;
}

const priceMultiplier: Record<string, number> = {
  STANDARD: 1,
  VIP: 1.5,
  COUPLE: 2,
  WHEELCHAIR: 1,
};

export const SeatTooltip: React.FC<SeatTooltipProps> = ({ seat, basePrice, children }) => {
  const [visible, setVisible] = useState(false);
  const price = (basePrice * (priceMultiplier[seat.seatType] ?? 1)).toFixed(2);

  return (
    <div
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
          bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
          <p className="text-white font-semibold">{seat.rowLabel}{seat.colNumber}</p>
          <p className="text-gray-400">{seat.seatType}</p>
          <p className="text-red-400 font-bold">LKR {price}</p>
          <p className="text-gray-500">{seat.seatState}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4
            border-transparent border-t-gray-600" />
        </div>
      )}
    </div>
  );
};