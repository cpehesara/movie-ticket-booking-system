import React from 'react';

const LEGEND = [
  { color: 'bg-green-600',  label: 'Available',    desc: 'Click to select' },
  { color: 'bg-yellow-500', label: 'Reserved',     desc: 'Held by another customer' },
  { color: 'bg-blue-600',   label: 'Booked',       desc: 'Paid, awaiting arrival' },
  { color: 'bg-orange-400 animate-pulse', label: 'Guiding', desc: 'LED blinking — customer walking to seat' },
  { color: 'bg-gray-700',   label: 'Occupied',     desc: 'Customer confirmed at seat' },
  { color: 'bg-red-500',    label: 'Selected',     desc: 'Your current selection' },
  { color: 'bg-gray-600',   label: 'Maintenance',  desc: 'Seat unavailable' },
] as const;

export interface SeatLegendProps {
  iotMode?: boolean;
}

export const SeatLegend: React.FC<SeatLegendProps> = ({ iotMode }) => (
  <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 justify-center">
    {LEGEND.map(({ color, label, desc }) => (
      <div key={label} className="flex items-center gap-2" title={desc}>
        <div className={`w-4 h-4 rounded ${color} flex-shrink-0`} />
        <span className="text-gray-400 text-xs">{label}</span>
      </div>
    ))}
  </div>
);