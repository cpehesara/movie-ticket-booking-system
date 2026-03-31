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

// ─── Animated LED-off indicator ───────────────────────────────────────────────

/**
 * Renders a seat "LED turning off" animation — transitions from RED glow
 * down to dim, simulating the physical LED strip behaviour.
 */
const LedOffIndicator: React.FC<{ seatLabel: string }> = ({ seatLabel }) => {
  const [phase, setPhase] = React.useState<'glow' | 'dimming' | 'off'>('glow');

  React.useEffect(() => {
    const t1 = setTimeout(() => setPhase('dimming'), 600);
    const t2 = setTimeout(() => setPhase('off'), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const styles: Record<string, React.CSSProperties> = {
    glow:    { backgroundColor: '#dc2626', boxShadow: '0 0 24px 10px rgba(220,38,38,0.8)', opacity: 1 },
    dimming: { backgroundColor: '#7f1d1d', boxShadow: '0 0 8px 3px rgba(220,38,38,0.3)', opacity: 0.6 },
    off:     { backgroundColor: '#1c1c1c', boxShadow: 'none', opacity: 0.2 },
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center font-mono font-bold text-white text-xs"
        style={{ transition: 'all 1.2s ease', ...styles[phase] }}
      >
        {seatLabel}
      </div>
      <p
        className="text-xs"
        style={{
          color: phase === 'off' ? '#4ade80' : '#f87171',
          transition: 'color 0.6s ease',
          fontSize: '0.68rem',
        }}
      >
        {phase === 'off' ? 'LED off — seated ✓' : 'LED on — guiding…'}
      </p>
    </div>
  );
};

// ─── Step progress bar ────────────────────────────────────────────────────────

interface StepProps { number: number; label: string; active: boolean; done: boolean; }

const Step: React.FC<StepProps> = ({ number, label, active, done }) => (
  <div className="flex flex-col items-center gap-1.5">
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-400"
      style={{
        backgroundColor: done ? '#16a34a' : active ? '#dc2626' : '#111827',
        color: done || active ? '#fff' : '#374151',
        border: `1px solid ${done ? '#16a34a' : active ? '#dc2626' : '#1f2937'}`,
        boxShadow: done
          ? '0 0 10px rgba(22,163,74,0.45)'
          : active
          ? '0 0 10px rgba(220,38,38,0.45)'
          : 'none',
      }}
    >
      {done ? '✓' : number}
    </div>
    <span style={{ color: active || done ? '#9ca3af' : '#374151', fontSize: '0.65rem' }}>{label}</span>
  </div>
);

const StepConnector: React.FC<{ done: boolean }> = ({ done }) => (
  <div
    className="flex-1 h-px mt-4"
    style={{
      backgroundColor: done ? '#16a34a' : '#1f2937',
      transition: 'background-color 0.4s ease',
      maxWidth: '3rem',
    }}
  />
);

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * SeatArrivalPage — IoT second-scan confirmation kiosk.
 *
 * Flow:
 *  Step 1: Customer scans their booking QR (validates identity).
 *  Step 2: Customer scans the static QR sticker attached to their physical seat.
 *          Format: "SEAT:{seatId}"
 *  → Backend: changes state CHECKED_IN → OCCUPIED, publishes MQTT LED off command.
 *  → LED on the strip turns OFF (or transitions to dim red then off).
 *  → IoTMonitorPage removes the amber pulse and the seat dims.
 */
export const SeatArrivalPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { result, loading, error, confirmArrival } = useSeatArrival();

  const [step, setStep]               = useState<'booking' | 'seat'>('booking');
  const [bookingCode, setBookingCode] = useState('');
  const [scannerActive, setScannerActive] = useState(true);
  const [seatScannerActive, setSeatScannerActive] = useState(false);

  const handleBookingCode = (code: string) => {
    setScannerActive(false);
    setBookingCode(code);
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
        const ids = (action.payload.seats as BookedSeatInfo[]).map(s => s.seatId);
        ids.forEach((id: number) => dispatch(clearInTransit(id)));
      }
    } catch { /* handled in slice */ }
  };

  const handleReset = () => {
    dispatch(reset());
    setStep('booking');
    setBookingCode('');
    setScannerActive(true);
    setSeatScannerActive(false);
  };

  const completed = result?.status === 'COMPLETED';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: '#080b10' }}
    >
      {/* Brand */}
      <div className="mb-6 text-center">
        <h1
          className="font-black tracking-widest uppercase"
          style={{ color: '#dc2626', fontSize: '1.1rem', letterSpacing: '0.35em' }}
        >
          CinePlex
        </h1>
        <p style={{ color: '#374151', fontSize: '0.7rem', marginTop: '3px', letterSpacing: '0.1em' }}>
          SEAT ARRIVAL STATION
        </p>
      </div>

      {/* Step progress */}
      <div className="flex items-center mb-8">
        <Step number={1} label="Booking QR" active={step === 'booking' && !completed} done={step === 'seat' || completed} />
        <StepConnector done={step === 'seat' || completed} />
        <Step number={2} label="Seat QR"    active={step === 'seat' && !completed}   done={completed} />
        <StepConnector done={completed} />
        <Step number={3} label="Seated"     active={false}                            done={completed} />
      </div>

      {loading && <Loading message="Confirming arrival…" />}

      {!loading && !completed && (
        <div className="w-full max-w-sm flex flex-col gap-5">

          {/* ── Step 1: Booking QR ── */}
          {step === 'booking' && (
            <>
              <div className="text-center">
                <span
                  className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(220,38,38,0.12)', color: '#f87171', border: '1px solid rgba(220,38,38,0.2)' }}
                >
                  Step 1 — Scan Booking QR
                </span>
                <p style={{ color: '#4b5563', fontSize: '0.72rem', marginTop: '8px' }}>
                  Use the QR code from your confirmation email
                </p>
              </div>

              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid #1f2937', backgroundColor: '#0d1117' }}
              >
                <QrScanner onScan={handleBookingCode} active={scannerActive} />
              </div>

              <div className="flex gap-2">
                <input
                  value={bookingCode}
                  onChange={e => setBookingCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && bookingCode.trim() && handleBookingCode(bookingCode.trim())}
                  placeholder="Or type booking code…"
                  className="flex-1 rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors"
                  style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937', color: '#d1d5db' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#dc2626')}
                  onBlur={e  => (e.currentTarget.style.borderColor = '#1f2937')}
                />
                <Button
                  onClick={() => bookingCode.trim() && handleBookingCode(bookingCode.trim())}
                  disabled={!bookingCode.trim()}
                >
                  Next →
                </Button>
              </div>
            </>
          )}

          {/* ── Step 2: Physical seat QR ── */}
          {step === 'seat' && (
            <>
              <div className="text-center">
                <span
                  className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}
                >
                  Step 2 — Scan Seat QR
                </span>
                <p style={{ color: '#4b5563', fontSize: '0.72rem', marginTop: '8px' }}>
                  Scan the QR sticker attached to your seat
                </p>
                <p
                  className="font-mono text-xs mt-1"
                  style={{ color: '#374151' }}
                >
                  {bookingCode}
                </p>
              </div>

              {/* LED "guiding" visual */}
              <div
                className="rounded-xl p-4 text-center"
                style={{ backgroundColor: '#0d1117', border: '1px solid rgba(251,146,60,0.2)' }}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span
                    className="w-3 h-3 rounded-full animate-pulse"
                    style={{ backgroundColor: '#f97316', boxShadow: '0 0 10px rgba(249,115,22,0.8)' }}
                  />
                  <span style={{ color: '#fb923c', fontSize: '0.75rem', fontWeight: 600 }}>
                    LED is guiding you to your seat
                  </span>
                </div>
                <p style={{ color: '#374151', fontSize: '0.65rem' }}>
                  Follow the amber light on the strip
                </p>
              </div>

              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(34,197,94,0.2)', backgroundColor: '#0d1117' }}
              >
                <QrScanner onScan={handleSeatScan} active={seatScannerActive} />
              </div>

              {!seatScannerActive && (
                <Button onClick={() => setSeatScannerActive(true)} fullWidth variant="secondary">
                  Retry Seat Scan
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => { setStep('booking'); setScannerActive(true); setSeatScannerActive(false); }}
              >
                ← Back
              </Button>
            </>
          )}

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

      {/* ── Success: Seated ── */}
      {!loading && completed && result && (
        <div
          className="w-full max-w-sm rounded-2xl p-6 flex flex-col items-center gap-5"
          style={{ backgroundColor: '#0d1117', border: '1px solid rgba(34,197,94,0.25)' }}
        >
          {/* LED off animations per seat */}
          <div className="flex gap-4 justify-center">
            {result.seats.map((s: BookedSeatInfo) => (
              <LedOffIndicator
                key={s.seatId}
                seatLabel={`${s.rowLabel}${s.colNumber}`}
              />
            ))}
          </div>

          <div className="text-center">
            <div
              className="text-4xl mb-3 flex items-center justify-center w-16 h-16 rounded-full mx-auto"
              style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}
            >
              🎬
            </div>
            <h2 className="text-xl font-bold text-white">Enjoy the show!</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '4px' }}>
              {result.movieTitle}
            </p>
          </div>

          {/* Seat confirmation */}
          <div className="w-full flex flex-col gap-2">
            {result.seats.map((s: BookedSeatInfo) => (
              <div
                key={s.seatId}
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}
              >
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: '#16a34a', boxShadow: '0 0 6px rgba(22,163,74,0.5)' }}
                />
                <span className="font-mono font-bold text-white text-sm">
                  {s.rowLabel}{s.colNumber}
                </span>
                <span style={{ color: '#4b5563', fontSize: '0.72rem' }}>confirmed &amp; seated</span>
              </div>
            ))}
          </div>

          <Button onClick={handleReset} variant="secondary" fullWidth>
            Next Customer
          </Button>
        </div>
      )}
    </div>
  );
};