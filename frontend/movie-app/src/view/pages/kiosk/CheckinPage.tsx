import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { performCheckin, reset } from '../../../viewmodel/slices/checkinSlice';
import { markInTransit } from '../../../viewmodel/slices/iotSlice';
import { BookedSeatInfo } from '../../../model/types/booking.types';
import { QrScanner } from '../../components/common/QrScanner';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';

// ─── Corner bracket decorations ──────────────────────────────────────────────

const CornerBrackets: React.FC<{ color?: string }> = ({ color = '#dc2626' }) => {
  const s = 22;   // length
  const t = 3;    // thickness
  const shared: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: color,
  };
  return (
    <>
      {/* Top-left */}
      <span style={{ ...shared, top: 0, left: 0, width: s, height: t }} className="animate-corner-pulse" />
      <span style={{ ...shared, top: 0, left: 0, width: t, height: s }} className="animate-corner-pulse" />
      {/* Top-right */}
      <span style={{ ...shared, top: 0, right: 0, width: s, height: t }} className="animate-corner-pulse" />
      <span style={{ ...shared, top: 0, right: 0, width: t, height: s }} className="animate-corner-pulse" />
      {/* Bottom-left */}
      <span style={{ ...shared, bottom: 0, left: 0, width: s, height: t }} className="animate-corner-pulse" />
      <span style={{ ...shared, bottom: 0, left: 0, width: t, height: s }} className="animate-corner-pulse" />
      {/* Bottom-right */}
      <span style={{ ...shared, bottom: 0, right: 0, width: s, height: t }} className="animate-corner-pulse" />
      <span style={{ ...shared, bottom: 0, right: 0, width: t, height: s }} className="animate-corner-pulse" />
    </>
  );
};

// ─── Scanning overlay with animated line ─────────────────────────────────────

const ScanOverlay: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
      style={{ zIndex: 10 }}
    >
      {/* Scan line */}
      <div
        className="animate-scanline"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(to right, transparent 0%, #dc2626 30%, #ef4444 50%, #dc2626 70%, transparent 100%)',
          boxShadow: '0 0 12px 4px rgba(220,38,38,0.6)',
        }}
      />
      {/* Dark vignette sides */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background:
            'linear-gradient(to right, rgba(8,11,16,0.4) 0%, transparent 15%, transparent 85%, rgba(8,11,16,0.4) 100%)',
        }}
      />
    </div>
  );
};

// ─── Step indicator ──────────────────────────────────────────────────────────

interface StepConfig { label: string; subLabel: string; }

const steps: StepConfig[] = [
  { label: 'Scan QR',    subLabel: 'Booking code' },
  { label: 'Navigate',   subLabel: 'Find your seat' },
  { label: 'Seat Scan',  subLabel: 'Confirm arrival' },
];

const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center gap-0 mb-8 animate-slide-up">
    {steps.map((s, i) => {
      const done   = i < current;
      const active = i === current;
      return (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-1.5" style={{ minWidth: 72 }}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500"
              style={{
                backgroundColor: done ? '#16a34a' : active ? '#dc2626' : '#111827',
                color: done || active ? '#fff' : '#374151',
                border: `2px solid ${done ? '#16a34a' : active ? '#dc2626' : '#1f2937'}`,
                boxShadow: done
                  ? '0 0 12px rgba(22,163,74,0.5)'
                  : active
                  ? '0 0 12px rgba(220,38,38,0.5)'
                  : 'none',
              }}
            >
              {done ? '✓' : active ? <span className="animate-pulse">●</span> : i + 1}
            </div>
            <div className="text-center">
              <p style={{ color: active || done ? '#d1d5db' : '#374151', fontSize: '0.65rem', fontWeight: 600 }}>
                {s.label}
              </p>
              <p style={{ color: '#374151', fontSize: '0.55rem' }}>{s.subLabel}</p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div
              className="flex-1 h-px mt-[-18px] transition-all duration-500"
              style={{
                backgroundColor: done ? '#16a34a' : '#1f2937',
                minWidth: 24,
              }}
            />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Seat navigation card ─────────────────────────────────────────────────────

const SeatNavCard: React.FC<{ seat: BookedSeatInfo; index: number }> = ({ seat, index }) => {
  const label = `${seat.rowLabel}${seat.colNumber}`;
  return (
    <div
      className="flex items-center gap-4 rounded-xl px-5 py-4 animate-slide-up"
      style={{
        backgroundColor: '#0d1117',
        border: '1px solid rgba(251,146,60,0.3)',
        boxShadow: '0 0 20px rgba(251,146,60,0.06)',
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Amber blinking LED dot */}
      <div className="relative flex-shrink-0">
        <div
          className="w-5 h-5 rounded-full animate-led-blink"
          style={{ backgroundColor: '#f97316' }}
        />
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{ backgroundColor: 'rgba(249,115,22,0.3)', animationDuration: '1s' }}
        />
      </div>

      <div className="flex-1">
        <p className="text-white font-black font-mono text-xl tracking-wide">{label}</p>
        <p style={{ color: '#6b7280', fontSize: '0.72rem', marginTop: '1px' }}>
          Row <strong style={{ color: '#d1d5db' }}>{seat.rowLabel}</strong>
          <span style={{ color: '#374151', margin: '0 5px' }}>·</span>
          Seat <strong style={{ color: '#d1d5db' }}>{seat.colNumber}</strong>
          {seat.seatType !== 'STANDARD' && (
            <span
              className="ml-2 text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ backgroundColor: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}
            >
              {seat.seatType}
            </span>
          )}
        </p>
      </div>

      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: 'rgba(251,146,60,0.12)', color: '#fb923c', fontSize: '1rem' }}
      >
        →
      </div>
    </div>
  );
};

// ─── Camera scan frame ────────────────────────────────────────────────────────

interface ScanFrameProps {
  onScan: (code: string) => void;
  scannerActive: boolean;
}

const ScanFrame: React.FC<ScanFrameProps> = ({ onScan, scannerActive }) => (
  <div className="relative animate-slide-up">
    {/* Outer glow ring */}
    <div
      className="absolute -inset-1 rounded-2xl"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(220,38,38,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}
    />

    {/* Scanner container */}
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        border: '1px solid rgba(220,38,38,0.25)',
        backgroundColor: '#0d1117',
        boxShadow: '0 0 32px rgba(220,38,38,0.08), inset 0 0 20px rgba(0,0,0,0.5)',
      }}
    >
      <ScanOverlay active={scannerActive} />
      <CornerBrackets />
      <div className="p-3">
        <QrScanner onScan={onScan} active={scannerActive} />
      </div>
    </div>

    {/* Status bar below scanner */}
    <div
      className="flex items-center justify-center gap-2 mt-2 py-2 rounded-lg"
      style={{ backgroundColor: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.1)' }}
    >
      {scannerActive ? (
        <>
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: '#dc2626', boxShadow: '0 0 6px rgba(220,38,38,0.8)' }}
          />
          <span style={{ color: '#9ca3af', fontSize: '0.7rem' }}>Camera active — align QR code in frame</span>
        </>
      ) : (
        <>
          <span style={{ color: '#374151', fontSize: '0.7rem' }}>Camera paused</span>
        </>
      )}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * CheckinPage — Entrance kiosk UI.
 *
 * IoT flow:
 *  1. Customer scans their booking QR (generated at payment time, emailed to them).
 *  2. Backend validates: seat state BOOKED → CHECKED_IN.
 *  3. Backend publishes MQTT WHITE_PULSE → LED strip enters guiding mode (amber).
 *  4. Backend fires WebSocket DOOR_SCAN event → IoTMonitorPage shows amber blink.
 *  5. This page dispatches markInTransit() so sidebar badge increments.
 *  6. Customer follows the blinking LED to their seat → SeatArrivalPage.
 */
export const CheckinPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { result, loading, error } = useSelector((s: RootState) => s.checkin);

  const [scannerActive, setScannerActive] = useState(true);
  const [manual, setManual]              = useState('');
  const inputRef                         = useRef<HTMLInputElement>(null);

  // When result arrives, mark seats as in-transit in Redux
  useEffect(() => {
    if (result?.seats) {
      const seatIds = result.seats
        .map(s => s.seatId)
        .filter((id): id is number => id != null);
      if (seatIds.length > 0) dispatch(markInTransit(seatIds));
    }
  }, [result, dispatch]);

  const handleScan = (code: string) => {
    setScannerActive(false);
    dispatch(performCheckin(code.trim()));
  };

  const handleManual = () => {
    const code = manual.trim();
    if (!code) return;
    setScannerActive(false);
    dispatch(performCheckin(code));
  };

  const handleReset = () => {
    dispatch(reset());
    setScannerActive(true);
    setManual('');
    setTimeout(() => inputRef.current?.blur(), 50);
  };

  const success = !!result && !loading;
  const step    = success ? 1 : 0;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        backgroundColor: '#080b10',
        backgroundImage:
          'radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.05) 0%, transparent 60%)',
      }}
    >
      {/* ── Brand ── */}
      <div className="mb-3 text-center animate-slide-up">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div
            className="w-1 h-6 rounded-full"
            style={{ backgroundColor: '#dc2626', boxShadow: '0 0 8px rgba(220,38,38,0.7)' }}
          />
          <h1
            className="font-black tracking-[0.35em] uppercase"
            style={{ color: '#ffffff', fontSize: '1.05rem' }}
          >
            CinePlex
          </h1>
          <div
            className="w-1 h-6 rounded-full"
            style={{ backgroundColor: '#dc2626', boxShadow: '0 0 8px rgba(220,38,38,0.7)' }}
          />
        </div>
        <p
          className="tracking-[0.25em] uppercase"
          style={{ color: '#374151', fontSize: '0.62rem', letterSpacing: '0.22em' }}
        >
          Entrance Check-In Kiosk
        </p>
      </div>

      {/* Divider */}
      <div
        className="mb-7"
        style={{
          width: '120px', height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(220,38,38,0.4), transparent)',
        }}
      />

      {/* ── Step indicator ── */}
      <StepIndicator current={step} />

      {/* ── Loading ── */}
      {loading && (
        <div className="w-full max-w-sm">
          <Loading message="Validating booking…" />
        </div>
      )}

      {/* ── Scan view ── */}
      {!loading && !result && (
        <div className="w-full max-w-sm flex flex-col gap-4">
          <p className="text-center" style={{ color: '#6b7280', fontSize: '0.8rem' }}>
            Present your booking QR code to the camera
          </p>

          <ScanFrame
            onScan={handleScan}
            scannerActive={scannerActive}
          />

          {/* Manual entry */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={manual}
              onChange={e => setManual(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManual()}
              placeholder="Type booking code manually…"
              className="flex-1 rounded-lg px-4 py-3 text-sm focus:outline-none transition-all"
              style={{
                backgroundColor: '#0d1117',
                border: '1px solid #1f2937',
                color: '#d1d5db',
              }}
              onFocus={e  => (e.currentTarget.style.borderColor = '#dc2626')}
              onBlur={e   => (e.currentTarget.style.borderColor = '#1f2937')}
            />
            <Button onClick={handleManual} disabled={!manual.trim()}>
              Submit
            </Button>
          </div>

          {/* Rescan button when scanner is paused */}
          {!scannerActive && (
            <Button variant="ghost" fullWidth onClick={() => setScannerActive(true)}>
              ↺ Retry Scan
            </Button>
          )}

          {/* Error */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm text-center animate-slide-up"
              style={{
                backgroundColor: 'rgba(239,68,68,0.07)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171',
              }}
            >
              <span style={{ marginRight: 6 }}>⚠</span>{error}
            </div>
          )}
        </div>
      )}

      {/* ── Success: Seat Navigation ── */}
      {!loading && result && (
        <div className="w-full max-w-sm flex flex-col gap-4 animate-slide-up">

          {/* Welcome card */}
          <div
            className="rounded-2xl p-5 text-center"
            style={{
              backgroundColor: '#0d1117',
              border: '1px solid rgba(34,197,94,0.2)',
              boxShadow: '0 0 32px rgba(34,197,94,0.06)',
            }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl"
              style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              ✓
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Booking Verified!</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{result.movieTitle}</p>
            <p className="font-mono text-xs mt-1" style={{ color: '#374151' }}>
              {result.bookingCode}
            </p>
          </div>

          {/* LED guiding notice */}
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
              backgroundColor: 'rgba(251,146,60,0.07)',
              border: '1px solid rgba(251,146,60,0.25)',
            }}
          >
            <div className="relative flex-shrink-0">
              <div
                className="w-4 h-4 rounded-full animate-led-blink"
                style={{ backgroundColor: '#f97316' }}
              />
              <div
                className="absolute inset-0 rounded-full animate-ping"
                style={{ backgroundColor: 'rgba(249,115,22,0.35)', animationDuration: '0.9s' }}
              />
            </div>
            <div>
              <p style={{ color: '#fb923c', fontSize: '0.78rem', fontWeight: 600 }}>
                LED Strip Activated — Guiding Mode
              </p>
              <p style={{ color: '#78350f', fontSize: '0.68rem', marginTop: '1px' }}>
                Follow the blinking amber lights to your seat
              </p>
            </div>
          </div>

          {/* Seat navigation cards */}
          <div className="flex flex-col gap-2">
            <p style={{ color: '#4b5563', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              Your Seat{result.seats.length > 1 ? 's' : ''}
            </p>
            {result.seats.map((s, i) => (
              <SeatNavCard key={s.seatId} seat={s} index={i} />
            ))}
          </div>

          {/* Instructions */}
          <div
            className="rounded-xl px-4 py-3 text-center"
            style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
          >
            <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
              Proceed to your seat and
            </p>
            <p style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600 }}>
              scan the QR sticker on your seat to confirm arrival
            </p>
          </div>

          <Button onClick={handleReset} variant="ghost" fullWidth>
            Next Customer →
          </Button>
        </div>
      )}

      {/* ── Footer ── */}
      <p
        className="mt-10"
        style={{ color: '#1f2937', fontSize: '0.6rem', letterSpacing: '0.08em' }}
      >
        CinePlex IoT Check-In System · v1.0
      </p>
    </div>
  );
};
