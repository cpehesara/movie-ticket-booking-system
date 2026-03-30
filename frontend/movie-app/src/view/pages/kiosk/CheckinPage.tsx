import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { performCheckin, reset } from '../../../viewmodel/slices/checkinSlice';
import { BookedSeatInfo } from '../../../model/types/booking.types';
import { QrScanner } from '../../components/common/QrScanner';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';

export const CheckinPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { result, loading, error } = useSelector((s: RootState) => s.checkin);
  const [scanning, setScanning] = useState(true);
  const [manual, setManual] = useState('');

  const handleScan = (code: string) => { setScanning(false); dispatch(performCheckin(code)); };
  const handleManual = () => { if (manual.trim()) { setScanning(false); dispatch(performCheckin(manual.trim())); } };
  const handleReset = () => { dispatch(reset()); setScanning(true); setManual(''); };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold text-white mb-2">🎬 CinePlex</h1>
      <p className="text-gray-500 mb-8">Scan your booking QR code</p>

      {loading && <Loading message="Validating booking..." />}

      {!loading && !result && (
        <div className="w-full max-w-sm flex flex-col gap-6">
          {scanning && <QrScanner onScan={handleScan} />}
          <div className="flex gap-2">
            <input value={manual} onChange={e => setManual(e.target.value)}
              placeholder="Or type booking code (BK-XXXXXXXX)"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3
                text-white text-sm focus:outline-none focus:border-red-500" />
            <Button onClick={handleManual}>Go</Button>
          </div>
          {error && <p className="text-red-400 text-sm text-center bg-red-950 rounded-lg p-3">{error}</p>}
        </div>
      )}

      {!loading && result && (
        <div className="w-full max-w-sm bg-gray-900 border border-green-700 rounded-2xl p-6
          flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-900 flex items-center justify-center text-3xl">✅</div>
          <h2 className="text-xl font-bold text-white">Welcome!</h2>
          <p className="text-gray-400 text-center text-sm">
            Please go to your seat and scan the QR code on it.
          </p>
          <div className="w-full bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs">Your seats</p>
            <p className="text-white font-bold text-lg">
              {result.seats.map((s: BookedSeatInfo) => `${s.rowLabel}${s.colNumber}`).join(', ')}
            </p>
            <p className="text-gray-500 text-sm mt-1">{result.movieTitle}</p>
          </div>
          <Button onClick={handleReset} variant="secondary" fullWidth>Scan Next Customer</Button>
        </div>
      )}
    </div>
  );
};