import React from 'react';
import { SeatInfo, SeatState } from '../../../model/types/seat.types';

interface SeatCellProps {
  seat: SeatInfo;
  selected: boolean;
  onSelect: (seatId: number) => void;
  /**
   * iotMode — when true, renders as a physical LED indicator rather than a
   * booking-UI seat button.  Used in HallDisplayPage and IoTMonitorPage.
   */
  iotMode?: boolean;
  /**
   * Marks this seat as "in transit" — the customer has scanned their booking
   * QR at the door and is walking toward the seat.  Triggers a pulsing amber
   * glow to guide staff attention.
   */
  inTransit?: boolean;
}

// ─── LED glow colours (inline style — Tailwind has no dynamic box-shadow) ───

const ledGlow: Record<SeatState, string> = {
  AVAILABLE:
    '0 0 8px 2px rgba(34,197,94,0.45), 0 0 2px 1px rgba(34,197,94,0.6)',
  RESERVED:
    '0 0 10px 3px rgba(234,179,8,0.55), 0 0 3px 1px rgba(234,179,8,0.7)',
  BOOKED:
    '0 0 10px 3px rgba(59,130,246,0.55), 0 0 3px 1px rgba(59,130,246,0.7)',
  OCCUPIED:
    '0 0 6px 2px rgba(239,68,68,0.35)',
  CANCELLED:
    '0 0 8px 2px rgba(34,197,94,0.45)',
  MAINTENANCE:
    'none',
};

const inTransitGlow =
  '0 0 18px 6px rgba(251,146,60,0.85), 0 0 6px 2px rgba(251,146,60,1)';

// ─── Booking-mode config ──────────────────────────────────────────────────────

interface StateConfig {
  bg: string;
  selectable: boolean;
  label: string;
}

const stateConfig: Record<SeatState, StateConfig> = {
  AVAILABLE:   { bg: 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer', selectable: true,  label: 'Available'    },
  RESERVED:    { bg: 'bg-yellow-500  cursor-not-allowed',                  selectable: false, label: 'Reserved'     },
  BOOKED:      { bg: 'bg-blue-600    cursor-not-allowed',                  selectable: false, label: 'Booked'       },
  OCCUPIED:    { bg: 'bg-red-600     cursor-not-allowed',                  selectable: false, label: 'Occupied'     },
  CANCELLED:   { bg: 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer', selectable: true,  label: 'Available'    },
  MAINTENANCE: { bg: 'bg-gray-600    cursor-not-allowed',                  selectable: false, label: 'Maintenance'  },
};

// ─── LED background colours for IoT mode ─────────────────────────────────────

const ledBg: Record<SeatState, string> = {
  AVAILABLE:   '#16a34a',
  RESERVED:    '#ca8a04',
  BOOKED:      '#2563eb',
  OCCUPIED:    '#dc2626',
  CANCELLED:   '#16a34a',
  MAINTENANCE: '#374151',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const SeatCell: React.FC<SeatCellProps> = ({
  seat,
  selected,
  onSelect,
  iotMode = false,
  inTransit = false,
}) => {
  if (!seat.isActive) {
    return <div className={iotMode ? 'w-9 h-9' : 'w-8 h-8'} />;
  }

  const label = `${seat.rowLabel}${seat.colNumber}`;

  // ── IoT / LED mode ──────────────────────────────────────────────────────────
  if (iotMode) {
    const dimmed = seat.seatState === 'OCCUPIED' || seat.seatState === 'MAINTENANCE';

    return (
      <div
        title={`${label} — ${inTransit ? 'IN TRANSIT' : seat.seatState}`}
        className={`
          relative w-9 h-9 rounded-full flex items-center justify-center
          text-white text-xs font-bold select-none transition-all duration-500
          ${inTransit ? 'animate-pulse' : ''}
        `}
        style={{
          backgroundColor: inTransit ? '#f97316' : ledBg[seat.seatState],
          opacity: dimmed && !inTransit ? 0.35 : 1,
          boxShadow: inTransit ? inTransitGlow : (dimmed ? 'none' : ledGlow[seat.seatState]),
          cursor: 'default',
        }}
      >
        <span
          className="text-white font-mono"
          style={{ fontSize: '0.6rem', lineHeight: 1, textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
        >
          {label}
        </span>

        {/* In-transit indicator ring */}
        {inTransit && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ backgroundColor: 'rgba(251,146,60,0.4)', animationDuration: '1s' }}
          />
        )}

        {/* VIP crown pip */}
        {seat.seatType === 'VIP' && (
          <span
            className="absolute -top-1 -right-1 text-yellow-300 text-xs leading-none"
            style={{ fontSize: '0.55rem' }}
          >★</span>
        )}
      </div>
    );
  }

  // ── Booking / selection mode ────────────────────────────────────────────────
  const cfg     = stateConfig[seat.seatState];
  const isSelected = selected && cfg.selectable;

  return (
    <button
      title={`${label} — ${cfg.label} — ${seat.seatType}`}
      disabled={!cfg.selectable}
      onClick={() => cfg.selectable && onSelect(seat.seatId)}
      className={`
        w-8 h-8 rounded text-xs font-bold transition-all duration-150
        ${cfg.bg}
        ${isSelected ? 'ring-2 ring-white scale-110 brightness-125' : ''}
        ${seat.seatType === 'VIP' ? 'rounded-t-2xl' : ''}
        ${seat.seatType === 'COUPLE' ? 'w-16' : ''}
      `}
      style={
        isSelected
          ? { boxShadow: '0 0 0 2px #fff, 0 0 8px 2px rgba(255,255,255,0.4)' }
          : undefined
      }
    >
      {seat.seatType === 'VIP'        ? '★'  : ''}
      {seat.seatType === 'WHEELCHAIR' ? '♿' : ''}
    </button>
  );
};