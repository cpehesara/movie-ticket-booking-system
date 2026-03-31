import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../viewmodel/store';
import { reset } from '../../../viewmodel/slices/checkinSlice';
import { clearInTransit } from '../../../viewmodel/slices/iotSlice';
import { useSeatArrival } from '../../../viewmodel/hooks/useSeatArrival';
import { BookedSeatInfo } from '../../../model/types/booking.types';
import { QrScanner } from '../../components/common/QrScanner';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';

// ─── Corner brackets (shared with CheckinPage pattern) ───────────────────────

const CornerBrackets: React.FC<{ color?: string }> = ({ color = '#22c55e' }) => {
  const s = 22;
  const t = 3;
  const shared: React.CSSProperties = { position: 'absolute', backgroundColor: color };
  return (
    <>
      <span style={{ ...shared, top: 0, left: 0, width: s, height: t }} className="animate-corner-pulse" />
      <span style={{ ...shared, top: 0, left: 0, width: t, height: s }} className="animate-corner-pulse" />
      <span style={{ ...shared, top: 0, right: 0, width: s, height: t }} className="animate-corner-pulse" />
      <span style={{ ...shared, top: 0, right: 0, width: t, height: s }} className="animate-corner-pulse" />
      <span style={{ ...shared, bottom: 0, left: 0, width: s, height: t }} className="animate-corner-pulse" />
      <span style={{ ...shared, bottom: 0, left: 0, width: t, height: s }} className="animate-corner-pulse" />
      <span style={{ ...shared, bottom: 0, right: 0, width: s, height: t }} className="animate-corner-pulse" />
      <span style={{ ...shared, bottom: 0, right: 0, width: t, height: s }} className="animate-corner-pulse" />
    </>
  );
};

// ─── Scan line overlay ────────────────────────────────────────────────────────

const ScanLine: React.FC<{ active: boolean; color?: string }> = ({
  active,
  color = '#22c55e',
}) => {
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl" style={{ zIndex: 10 }}>
      <div
        className="animate-scanline"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(to right, transparent 0%, ${color} 30%, #86efac 50%, ${color} 70%, transparent 100%)`,
          boxShadow: `0 0 12px 4px ${color}80`,
        }}
      />
    </div>
  );
};

// ─── Step progress ────────────────────────────────────────────────────────────

interface StepDef { label: string; sub: string; }
const STEPS: StepDef[] = [
  { label: 'Booking QR', sub: 'Verify identity' },
  { label: 'Seat QR',    sub: 'Confirm location' },
  { label: 'Seated',     sub: 'Enjoy the show' },
];

const StepBar: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center mb-8 animate-slide-up">
    {STEPS.map((s, i) => {
      const done   = i < current;
      const active = i === current;
      const accent = active ? '#22c55e' : done ? '#16a34a' : '#111827';
      return (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-1.5" style={{ minWidth: 80 }}>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500"
              style={{
                backgroundColor: accent,
                color: done || active ? '#fff' : '#374151',
                border: `2px solid ${done ? '#16a34a' : active ? '#22c55e' : '#1f2937'}`,
                boxShadow: active ? '0 0 14px rgba(34,197,94,0.5)' : done ? '0 0 10px rgba(22,163,74,0.4)' : 'none',
              }}
            >
              {done ? '✓' : i + 1}
            </div>
            <div className="text-center">
              <p style={{ color: active || done ? '#d1d5db' : '#374151', fontSize: '0.65rem', fontWeight: 600 }}>
                {s.label}
              </p>
              <p style={{ color: '#374151', fontSize: '0.55rem' }}>{s.sub}</p>
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className="flex-1 h-px mt-[-18px] transition-all duration-500"
              style={{ backgroundColor: done ? '#16a34a' : '#1f2937', minWidth: 20 }}
            />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── LED off animation (seat confirmed) ──────────────────────────────────────

const LedOffDot: React.FC<{ label: string }> = ({ label }) => {
  const [phase, setPhase] = React.useState<'glow' | 'dim' | 'off'>('glow');

  React.useEffect(() => {
    const t1 = setTimeout(() => setPhase('dim'), 700);
    const t2 = setTimeout(() => setPhase('off'), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const bg: Record<string, string> = {
    glow: '#f97316', dim: '#7f1d1d', off: '#1c1c1c',
  };
  const shadow: Record<string, string> = {
    glow: '0 0 28px 12px rgba(249,115,22,0.8)',
    dim:  '0 0 10px 4px rgba(220,38,38,0.3)',
    off:  'none',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center font-mono font-black text-white text-sm"
        style={{
          backgroundColor: bg[phase],
          boxShadow: shadow[phase],
          transition: 'all 1.3s ease',
          opacity: phase === 'off' ? 0.3 : 1,
        }}
      >
        {label}
      </div>
      <p
        style={{
          fontSize: '0.68rem',
          fontWeight: 600,
          color: phase === 'off' ? '#4ade80' : '#fb923c',
          transition: 'color 0.6s ease',
        }}
      >
        {phase === 'off' ? '✓ Seated' : 'LED off…'}
      </p>
    </div>
  );
};

// ─── In-transit LED blink banner ──────────────────────────────────────────────

const InTransitBanner: React.FC = () => (
  <div
    className="rounded-xl px-4 py-3 animate-slide-up"
    style={{
      backgroundColor: 'rgba(251,146,60,0.07)',
      border: '1px solid rgba(251,146,60,0.25)',
    }}
  >
    <div className="flex items-center gap-3">
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
        <p style={{ color: '#fb923c', fontSize: '0.78rem', fontWeight: 700 }}>
          LED Guiding Active
        </p>
        <p style={{ color: '#92400e', fontSize: '0.67rem', marginTop: '1px' }}>
          Your seat is blinking — scan the sticker on the seat
        </p>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * SeatArrivalPage — IoT kiosk fallback for second-scan seat confirmation.
 *
 * NOTE: The PRIMARY seat confirmation path is via the customer's own phone
 *       from My Bookings → "Confirm My Seat" button. This kiosk page acts
 *       as a staff-operated fallback for customers without phones.
 *
 * Flow:
 *  Step 1: Customer scans their booking QR (validates identity + maps seats).
 *  Step 2: Customer scans the static QR sticker on their physical seat.
 *          Sticker format: "SEAT:{seatId}"  e.g. "SEAT:14"
 *          This matches useSeatArrival hook regex: /^SEAT:(\d+)$/
 *  → Backend: seatId extracted, transitions seat state → OCCUPIED.
 *  → MQTT LED off command published for that seat's LED index.
 *  → IoTMonitorPage removes amber pulse; LED strip turns off.
 */
export const SeatArrivalPage: React.FC = () => {
  const dispatch                        = useDispatch<AppDispatch>();
  const { result, loading, error, confirmArrival } = useSeatArrival();

  const [step, setStep]                   = useState<'booking' | 'seat'>('booking');
  const [bookingCode, setBookingCode]     = useState('');
  const [bookingScannerActive, setBookingScannerActive] = useState(true);
  const [seatScannerActive, setSeatScannerActive]       = useState(false);

  const handleBookingScan = (code: string) => {
    setBookingScannerActive(false);
    setBookingCode(code.trim());
    setStep('seat');
    setSeatScannerActive(true);
  };

  const handleSeatScan = async (rawQr: string) => {
    setSeatScannerActive(false);
    try {
      const action = await confirmArrival(bookingCode, rawQr);
      // @ts-ignore
      if (action?.payload?.seats) {
        // @ts-ignore
        const ids = (action.payload.seats as BookedSeatInfo[]).map((s: BookedSeatInfo) => s.seatId);
        ids.forEach((id: number) => dispatch(clearInTransit(id)));
      }
    } catch { /* handled in slice */ }
  };

  const handleReset = () => {
    dispatch(reset());
    setStep('booking');
    setBookingCode('');
    setBookingScannerActive(true);
    setSeatScannerActive(false);
  };

  const completed = result?.status === 'COMPLETED';
  const stepIndex = completed ? 2 : step === 'seat' ? 1 : 0;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        backgroundColor: '#080b10',
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.04) 0%, transparent 60%)',
      }}
    >
      {/* ── Brand ── */}
      <div className="mb-3 text-center animate-slide-up">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-1 h-6 rounded-full" style={{ backgroundColor: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.7)' }} />
          <h1 className="font-black tracking-[0.3em] uppercase" style={{ color: '#ffffff', fontSize: '1.05rem' }}>
            CinePlex
          </h1>
          <div className="w-1 h-6 rounded-full" style={{ backgroundColor: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.7)' }} />
        </div>
        <p className="tracking-[0.22em] uppercase" style={{ color: '#374151', fontSize: '0.62rem' }}>
          Seat Arrival Station
        </p>
      </div>

      <div
        className="mb-7"
        style={{
          width: '120px', height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(34,197,94,0.4), transparent)',
        }}
      />

      <StepBar current={stepIndex} />

      {/* ── Loading ── */}
      {loading && <Loading message="Confirming arrival…" />}

      {/* ── Step 1: Booking QR ── */}
      {!loading && !completed && step === 'booking' && (
        <div className="w-full max-w-sm flex flex-col gap-4 animate-slide-up">
          <div className="text-center">
            <span
              className="inline-block text-xs font-bold px-3 py-1.5 rounded-full mb-2"
              style={{
                backgroundColor: 'rgba(220,38,38,0.1)',
                color: '#f87171',
                border: '1px solid rgba(220,38,38,0.2)',
              }}
            >
              Step 1 of 2 — Booking QR
            </span>
            <p style={{ color: '#6b7280', fontSize: '0.78rem' }}>
              Scan the QR code from your confirmation email
            </p>
          </div>

          {/* Scanner */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(220,38,38,0.2)', backgroundColor: '#0d1117' }}
          >
            <ScanLine active={bookingScannerActive} color="#dc2626" />
            <CornerBrackets color="#dc2626" />
            <div className="p-3">
              <QrScanner onScan={handleBookingScan} active={bookingScannerActive} />
            </div>
          </div>

          {/* Status */}
          <div
            className="flex items-center justify-center gap-2 py-2 rounded-lg"
            style={{ backgroundColor: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.1)' }}
          >
            {bookingScannerActive ? (
              <>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#dc2626', boxShadow: '0 0 6px #dc2626' }} />
                <span style={{ color: '#9ca3af', fontSize: '0.7rem' }}>Camera active — align booking QR</span>
              </>
            ) : (
              <span style={{ color: '#374151', fontSize: '0.7rem' }}>Camera paused</span>
            )}
          </div>

          {/* Manual input */}
          <div className="flex gap-2">
            <input
              value={bookingCode}
              onChange={e => setBookingCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && bookingCode.trim() && handleBookingScan(bookingCode.trim())}
              placeholder="Or type booking code…"
              className="flex-1 rounded-lg px-4 py-3 text-sm focus:outline-none"
              style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937', color: '#d1d5db' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#dc2626')}
              onBlur={e  => (e.currentTarget.style.borderColor = '#1f2937')}
            />
            <Button
              onClick={() => bookingCode.trim() && handleBookingScan(bookingCode.trim())}
              disabled={!bookingCode.trim()}
            >
              Next →
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Physical Seat QR ── */}
      {!loading && !completed && step === 'seat' && (
        <div className="w-full max-w-sm flex flex-col gap-4 animate-slide-up">
          <div className="text-center">
            <span
              className="inline-block text-xs font-bold px-3 py-1.5 rounded-full mb-2"
              style={{
                backgroundColor: 'rgba(34,197,94,0.1)',
                color: '#4ade80',
                border: '1px solid rgba(34,197,94,0.2)',
              }}
            >
              Step 2 of 2 — Seat QR
            </span>
            <p style={{ color: '#6b7280', fontSize: '0.78rem' }}>
              Scan the permanent QR sticker on your physical seat
            </p>
            <p style={{ color: '#374151', fontSize: '0.65rem', marginTop: 3 }}>
              Alternatively, use your phone: My Bookings → Confirm Seat
            </p>
            <p className="font-mono text-xs mt-1" style={{ color: '#374151' }}>{bookingCode}</p>
          </div>

          {/* In-transit LED banner */}
          <InTransitBanner />

          {/* Seat QR scanner */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(34,197,94,0.2)', backgroundColor: '#0d1117' }}
          >
            <ScanLine active={seatScannerActive} color="#22c55e" />
            <CornerBrackets color="#22c55e" />
            <div className="p-3">
              <QrScanner onScan={handleSeatScan} active={seatScannerActive} />
            </div>
          </div>

          {/* Scanner status */}
          <div
            className="flex items-center justify-center gap-2 py-2 rounded-lg"
            style={{ backgroundColor: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}
          >
            {seatScannerActive ? (
              <>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                <span style={{ color: '#9ca3af', fontSize: '0.7rem' }}>Camera active — scan seat QR sticker</span>
              </>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setSeatScannerActive(true)}>
                ↺ Retry Seat Scan
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={() => { setStep('booking'); setBookingScannerActive(true); setSeatScannerActive(false); }}
          >
            ← Back to Booking Scan
          </Button>
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div
          className="w-full max-w-sm mt-3 rounded-xl px-4 py-3 text-sm text-center animate-slide-up"
          style={{ backgroundColor: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
        >
          <span style={{ marginRight: 6 }}>⚠</span>{error}
        </div>
      )}

      {/* ── Success: Seated ── */}
      {!loading && completed && result && (
        <div
          className="w-full max-w-sm rounded-2xl p-6 flex flex-col items-center gap-5 animate-slide-up"
          style={{
            backgroundColor: '#0d1117',
            border: '1px solid rgba(34,197,94,0.25)',
            boxShadow: '0 0 40px rgba(34,197,94,0.08)',
          }}
        >
          {/* LED off animation per seat */}
          <div className="flex gap-6 justify-center">
            {result.seats.map((s: BookedSeatInfo) => (
              <LedOffDot key={s.seatId} label={`${s.rowLabel}${s.colNumber}`} />
            ))}
          </div>

          {/* Movie icon + title */}
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl"
              style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              🎬
            </div>
            <h2 className="text-2xl font-black text-white">Enjoy the show!</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.82rem', marginTop: '4px' }}>{result.movieTitle}</p>
          </div>

          {/* Confirmed seats list */}
          <div className="w-full flex flex-col gap-2">
            {result.seats.map((s: BookedSeatInfo) => (
              <div
                key={s.seatId}
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: '#16a34a', boxShadow: '0 0 8px rgba(22,163,74,0.6)' }}
                />
                <span className="font-mono font-black text-white">
                  {s.rowLabel}{s.colNumber}
                </span>
                <span style={{ color: '#6b7280', fontSize: '0.72rem', flex: 1 }}>
                  {s.seatType}
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: '#4ade80' }}
                >
                  ✓ Confirmed
                </span>
              </div>
            ))}
          </div>

          <Button onClick={handleReset} variant="secondary" fullWidth>
            Next Customer →
          </Button>
        </div>
      )}

      <p className="mt-10" style={{ color: '#1f2937', fontSize: '0.6rem', letterSpacing: '0.08em' }}>
        CinePlex IoT Seat Arrival System · v1.0
      </p>
    </div>
  );
};
