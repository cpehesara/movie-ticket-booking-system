import React from 'react';

const items = [
  { color: 'bg-green-600', label: 'Available' },
  { color: 'bg-yellow-500', label: 'Reserved' },
  { color: 'bg-blue-600', label: 'Booked' },
  { color: 'bg-red-600', label: 'Occupied' },
  { color: 'bg-gray-600', label: 'Maintenance' },
  { color: 'bg-green-600 ring-2 ring-white', label: 'Selected' },
];

export const SeatLegend: React.FC = () => (
  <div className="flex flex-wrap justify-center gap-4 py-4">
    {items.map(({ color, label }) => (
      <div key={label} className="flex items-center gap-2">
        <div className={`w-5 h-5 rounded ${color}`} />
        <span className="text-gray-400 text-xs">{label}</span>
      </div>
    ))}
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 rounded-t-2xl bg-green-600 text-center text-xs leading-5">★</div>
      <span className="text-gray-400 text-xs">VIP</span>
    </div>
  </div>
);