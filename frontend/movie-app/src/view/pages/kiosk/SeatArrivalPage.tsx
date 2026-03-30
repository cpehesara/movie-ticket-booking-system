import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../viewmodel/store';
import { reset } from '../../../viewmodel/slices/checkinSlice';
import { useSeatArrival } from '../../../viewmodel/hooks/useSeatArrival';
import { BookedSeatInfo } from '../../../model/types/booking.types';
import { QrScanner } from '../../components/common/QrScanner';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';

export const SeatArrivalPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { result, loading, error, confirmArrival } = useSeatArrival();
  const [step, setStep] = useState<'booking' | 'seat'>('booking');
  const [bookingCode, setBookingCode] = useState('');
  const [scanSeat, setScanSeat] = useState(false);

  const handleBookingCode = (code: string) => { setBookingCode(code); setStep('seat'); setScanSeat(true); };
  const handleSeatScan = async (rawQr: string) => { setScanSeat(false); await confirmArrival(bookingCode, rawQr).catch(() => {}); };
  const handleReset = () => { dispatch(reset()); setStep('booking'); setBookingCode(''); setScanSeat(false); };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold text-white mb-2">🪑 Seat Arrival</h1>
      <p className="text-gray-500 mb-8 text-sm text-center">
        Step 1: Scan booking QR → Step 2: Scan seat QR
      </p>

      {loading && <Loading message="Confirming seat..." />}

      {!loading && !result && (
        <div className="w-full max-w-sm flex flex-col gap-6">
          {step === 'booking' && (
            <>
              <div className="text-center py-2">
                <span className="bg-red-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
                  STEP 1 — Scan Booking QR
                </span>
              </div>
              <QrScanner onScan={handleBookingCode} />
              <div className="flex gap-2">
                <input value={bookingCode} onChange={e => setBookingCode(e.target.value)}
                  placeholder="Or type booking code"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3
                    text-white text-sm focus:outline-none focus:border-red-500" />
                <Button onClick={() => bookingCode && setStep('seat')}>Next</Button>
              </div>
            </>
          )}

          {step === 'seat' && (
            <>
              <div className="text-center py-2">
                <span className="bg-green-700 text-white text-xs px-3 py-1 rounded-full font-semibold">
                  STEP 2 — Scan Seat QR
                </span>
                <p className="text-gray-500 text-xs mt-2">Code: {bookingCode}</p>
              </div>
              {scanSeat
                ? <QrScanner onScan={handleSeatScan} />
                : <Button onClick={() => setScanSeat(true)} fullWidth>Start Seat Scan</Button>
              }
              <Button variant="ghost" onClick={() => setStep('booking')} fullWidth size="sm">← Back</Button>
            </>
          )}

          {error && <p className="text-red-400 text-sm text-center bg-red-950 rounded-lg p-3">{error}</p>}
        </div>
      )}

      {!loading && result?.status === 'COMPLETED' && (
        <div className="w-full max-w-sm bg-gray-900 border border-green-700 rounded-2xl p-6
          flex flex-col items-center gap-4">
          <div className="text-5xl">🎉</div>
          <h2 className="text-xl font-bold text-white text-center">Enjoy the show!</h2>
          <p className="text-gray-400 text-sm text-center">
            {result.seats.map((s: BookedSeatInfo) => `${s.rowLabel}${s.colNumber}`).join(', ')} —{' '}
            {result.movieTitle}
          </p>
          <Button onClick={handleReset} variant="secondary" fullWidth>Next Customer</Button>
        </div>
      )}
    </div>
  );
};