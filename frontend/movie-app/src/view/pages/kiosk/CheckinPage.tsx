import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { performCheckin, reset } from '../../../viewmodel/slices/checkinSlice';
import { markInTransit } from '../../../viewmodel/slices/iotSlice';
import { BookedSeatInfo } from '../../../model/types/booking.types';
import { QrScanner } from '../../components/common/QrScanner';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';

// ─── Seat direction indicator ────────────────────────────────────────────────

interface SeatDirectionProps {
  seats: BookedSeatInfo[];
}

/** Renders a simple "Go to Row X, Seat Y" navigation card per seat. */
const SeatDirectionCard: React.FC<SeatDirectionProps> = ({ seats }) => (
  <div className="w-full flex flex-col gap-2">
    {seats.map(s => {
      const label = `${s.rowLabel}${s.colNumber}`;
      return (
        <div
          key={s.seatId}
          className="flex items-center gap-4 rounded-xl px-5 py-4"
          style={{
            backgroundColor: '#0d1117',
            border: '1px solid rgba(251,146,60,0.35)',
            boxShadow: '0 0 16px rgba(251,146,60,0.08)',
          }}
        >
          {/* LED indicator simulation */}
          <span
            className="w-5 h-5 rounded-full flex-shrink-0 animate-pulse"
            style={{
              backgroundColor: '#f97316',
              boxShadow: '0 0 14px 4px rgba(249,115,22,0.75)',
            }}
          />
          <div className="flex-1">
            <p className="text-white font-bold text-lg font-mono tracking-wide">{label}</p>
            <p style={{ color: '#6b7280', fontSize: '0.72rem' }}>
              Row <strong style={{ color: '#d1d5db' }}>{s.rowLabel}</strong>
              {' '}· Seat <strong style={{ color: '#d1d5db' }}>{s.colNumber}</strong>
              {s.seatType !== 'STANDARD' && (
                <span
                  className="ml-2 text-xs px-1.5 py-0.5 rounded font-semibold"
                  style={{ backgroundColor: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}
                >
                  {s.seatType}
                </span>
              )}
            </p>
          </div>
          <span style={{ color: '#374151', fontSize: '1.4rem' }}>→</span>
        </div>
      );
    })}
  </div>
);

// ─── Step indicator ──────────────────────────────────────────────────────────

const StepDot: React.FC<{ active: boolean; done: boolean; label: string }> = ({ active, done, label }) => (
  <div className="flex flex-col items-center gap-1">
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
      style={{
        backgroundColor: done
          ? '#16a34a'
          : active
          ? '#dc2626'
          : '#1f2937',
        color: done || active ? '#fff' : '#374151',
        boxShadow: done
          ? '0 0 8px rgba(22,163,74,0.5)'
          : active
          ? '0 0 8px rgba(220,38,38,0.5)'
          : 'none',
      }}
    >
      {done ? '✓' : active ? '●' : '○'}
    </div>
    <span style={{ color: active || done ? '#9ca3af' : '#374151', fontSize: '0.6rem' }}>{label}</span>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

/**
 * CheckinPage — Entrance kiosk UI.
 *
 * IoT flow:
 *  1. Customer scans their booking QR (generated at payment time).
 *  2. Backend validates and changes seat state BOOKED → CHECKED_IN.
 *  3. Backend publishes MQTT SET_LED (YELLOW→AMBER on ESP32) and WebSocket
 *     DOOR_SCAN event, which the IoTMonitorPage picks up to show amber pulse.
 *  4. This page dispatches markInTransit() so the sidebar badge updates.
 *  5. Customer walks to seat and scans physical seat QR → SeatArrivalPage.
 */
export const CheckinPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { result, loading, error } = useSelector((s: RootState) => s.checkin);

  const [scanning, setScanning]     = useState(true);
  const [manual, setManual]         = useState('');
  const [scannerActive, setScannerActive] = useState(true);

  // When result arrives, mark seats as in-transit in Redux
  // so IoTMonitorPage reflects the amber-pulsing seats immediately
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
    setScanning(false);
    dispatch(performCheckin(code));
  };

  const handleManual = () => {
    const code = manual.trim();
    if (!code) return;
    setScanning(false);
    dispatch(performCheckin(code));
  };

  const handleReset = () => {
    dispatch(reset());
    setScanning(true);
    setScannerActive(true);
    setManual('');
  };

  const success = !!result && !loading;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: '#080b10' }}
    >
      {/* Brand */}
      <div className="mb-8 text-center">
        <h1
          className="font-black tracking-widest uppercase"
          style={{ color: '#dc2626', fontSize: '1.1rem', letterSpacing: '0.35em' }}
        >
          CinePlex
        </h1>
        <p style={{ color: '#374151', fontSize: '0.7rem', marginTop: '3px', letterSpacing: '0.1em' }}>
          ENTRANCE KIOSK
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-8">
        <StepDot active={!success && !loading} done={success} label="Scan QR" />
        <div
          className="h-px flex-1"
          style={{
            width: '3rem',
            backgroundColor: success ? '#16a34a' : '#1f2937',
          }}
        />
        <StepDot active={false} done={false} label="Go to Seat" />
        <div className="h-px" style={{ width: '3rem', backgroundColor: '#1f2937' }} />
        <StepDot active={false} done={false} label="Seat Scan" />
      </div>

      {loading && (
        <div className="w-full max-w-sm">
          <Loading message="Validating booking…" />
        </div>
      )}

      {!loading && !result && (
        <div className="w-full max-w-sm flex flex-col gap-5">
          <p
            className="text-center font-medium"
            style={{ color: '#9ca3af', fontSize: '0.85rem' }}
          >
            Scan your booking QR code
          </p>

          {scanning && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid #1f2937', backgroundColor: '#0d1117' }}
            >
              <QrScanner onScan={handleScan} active={scannerActive} />
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={manual}
              onChange={e => setManual(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManual()}
              placeholder="Or type booking code…"
              className="flex-1 rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors"
              style={{
                backgroundColor: '#0d1117',
                border: '1px solid #1f2937',
                color: '#d1d5db',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#dc2626')}
              onBlur={e  => (e.currentTarget.style.borderColor = '#1f2937')}
            />
            <Button onClick={handleManual} disabled={!manual.trim()}>Go</Button>
          </div>

          {error && (
            <div
              className="rounded-lg px-4 py-3 text-sm text-center"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
            >
              {error}
            </div>
          )}
        </div>
      )}

      {!loading && result && (
        <div
          className="w-full max-w-sm rounded-2xl p-6 flex flex-col items-center gap-5"
          style={{ backgroundColor: '#0d1117', border: '1px solid rgba(34,197,94,0.25)' }}
        >
          {/* Success icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(34,197,94,0.12)', fontSize: '1.8rem' }}
          >
            ✓
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold text-white">Welcome!</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '4px' }}>
              {result.movieTitle}
            </p>
            <p
              className="font-mono text-xs mt-1"
              style={{ color: '#4b5563' }}
            >
              {result.bookingCode}
            </p>
          </div>

          {/* LED is now AMBER — customer is in transit */}
          <div
            className="w-full rounded-lg px-4 py-3 text-center text-sm font-medium"
            style={{ backgroundColor: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)', color: '#fb923c' }}
          >
            ◉ LED activated — seat guiding mode
          </div>

          {/* Seat directions */}
          <SeatDirectionCard seats={result.seats} />

          <p style={{ color: '#4b5563', fontSize: '0.72rem', textAlign: 'center' }}>
            Now scan the QR code on your physical seat to confirm arrival.
          </p>

          <Button onClick={handleReset} variant="ghost" fullWidth>
            Next Customer
          </Button>
        </div>
      )}
    </div>
  );
};