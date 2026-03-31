import React from 'react';

interface SeatLegendProps {
  /** When true, renders LED-style indicators with glow matching IoTMonitorPage */
  iotMode?: boolean;
}

const bookingItems = [
  { color: 'bg-emerald-600', label: 'Available' },
  { color: 'bg-yellow-500',  label: 'Reserved'  },
  { color: 'bg-blue-600',    label: 'Booked'    },
  { color: 'bg-red-600',     label: 'Occupied'  },
  { color: 'bg-gray-600',    label: 'Maintenance' },
];

interface LedItem {
  bg: string;
  glow?: string;
  pulse?: boolean;
  label: string;
  opacity?: number;
}

const ledItems: LedItem[] = [
  {
    bg: '#16a34a',
    glow: '0 0 8px 2px rgba(34,197,94,0.5)',
    label: 'Available',
  },
  {
    bg: '#ca8a04',
    glow: '0 0 10px 3px rgba(234,179,8,0.6)',
    label: 'Reserved',
  },
  {
    bg: '#2563eb',
    glow: '0 0 10px 3px rgba(59,130,246,0.6)',
    label: 'Booked',
  },
  {
    bg: '#f97316',
    glow: '0 0 16px 5px rgba(251,146,60,0.8)',
    pulse: true,
    label: 'In Transit (door scanned)',
  },
  {
    bg: '#dc2626',
    opacity: 0.35,
    label: 'Occupied (LED off)',
  },
  {
    bg: '#374151',
    label: 'Maintenance',
  },
];

export const SeatLegend: React.FC<SeatLegendProps> = ({ iotMode = false }) => {
  if (iotMode) {
    return (
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 py-4">
        {ledItems.map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className={`inline-block rounded-full ${item.pulse ? 'animate-pulse' : ''}`}
              style={{
                width: '14px',
                height: '14px',
                backgroundColor: item.bg,
                opacity: item.opacity ?? 1,
                boxShadow: item.glow ?? 'none',
                flexShrink: 0,
              }}
            />
            <span style={{ color: '#9ca3af', fontSize: '0.7rem' }}>{item.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 py-4">
      {bookingItems.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded ${color} flex-shrink-0`} />
          <span className="text-gray-400 text-xs">{label}</span>
        </div>
      ))}
      {/* VIP indicator */}
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-t-xl bg-emerald-600 text-center flex items-center justify-center flex-shrink-0">
          <span style={{ fontSize: '0.5rem', color: '#fde047' }}>★</span>
        </div>
        <span className="text-gray-400 text-xs">VIP</span>
      </div>
      {/* Selected indicator */}
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded bg-emerald-600 flex-shrink-0"
          style={{ boxShadow: '0 0 0 2px #fff, 0 0 6px 2px rgba(255,255,255,0.35)' }}
        />
        <span className="text-gray-400 text-xs">Selected</span>
      </div>
    </div>
  );
};