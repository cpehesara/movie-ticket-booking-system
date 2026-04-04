import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { seatArrivalApi, SeatArrivalResult } from '../../../model/api/seatArrivalApi';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { QrScanner } from '../../components/common/QrScanner';
import { Loading } from '../../components/common/Loading';
import { Button } from '../../components/common/Button';

export const SeatScanPage: React.FC = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'scanning' | 'loading' | 'success' | 'error'>('scanning');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<SeatArrivalResult | null>(null);

  const handleScan = useCallback(async (rawQr: string) => {
    // Basic validation
    const match = rawQr.trim().match(/^SEAT:(\d+)/);
    if (!match) {
      setErrorMsg(`Unrecognised QR code. Please scan the QR sticker on your assigned seat.`);
      setPhase('error');
      return;
    }

    setPhase('loading');
    try {
      const res = await seatArrivalApi.confirm(rawQr.trim());
      setResult(res);
      setPhase('success');
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? 'Seat confirmation failed. Please try again.');
      setPhase('error');
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl text-center">
          {phase === 'scanning' && (
            <>
              <h1 className="text-xl font-bold text-white mb-2">Scan Your Seat</h1>
              <p className="text-gray-400 text-sm mb-6">
                Point your camera at the permanent QR sticker on your physical seat to confirm your arrival.
              </p>
              <div className="mx-auto" style={{ maxWidth: '280px' }}>
                <QrScanner onScan={handleScan} active={true} />
              </div>
              <Button onClick={() => navigate('/bookings')} variant="secondary" className="mt-6 w-full">
                Cancel
              </Button>
            </>
          )}

          {phase === 'loading' && (
            <div className="py-12">
              <Loading message="Confirming your seat..." />
            </div>
          )}

          {phase === 'success' && result && (
            <div className="py-8 animate-fade-in">
              <div className="w-16 h-16 mx-auto bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-3xl mb-4 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                ✓
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Seat Confirmed!</h2>
              <p className="text-green-400 font-medium text-lg mb-4">{result.message}</p>
              
              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 text-left space-y-2 mb-6">
                {result.movieTitle && (
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Movie</span>
                    <span className="text-white text-sm font-semibold">{result.movieTitle}</span>
                  </div>
                )}
                {result.seatLabel && (
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Seat</span>
                    <span className="text-white text-sm font-mono">{result.seatLabel}</span>
                  </div>
                )}
              </div>
              
              <Button onClick={() => navigate('/movies')} className="w-full">
                Explore More Movies
              </Button>
            </div>
          )}

          {phase === 'error' && (
            <div className="py-8 animate-fade-in">
              <div className="w-16 h-16 mx-auto bg-red-500/10 text-red-500 rounded-full flex items-center justify-center text-3xl mb-4">
                !
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Scan Failed</h2>
              <p className="text-gray-400 text-sm mb-6">{errorMsg}</p>
              <div className="flex flex-col gap-3">
                <Button onClick={() => setPhase('scanning')} className="w-full">
                  Try Again
                </Button>
                <Button onClick={() => navigate('/bookings')} variant="secondary" className="w-full">
                  Go to My Bookings
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};