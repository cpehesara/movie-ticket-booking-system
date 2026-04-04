import React, { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  active?: boolean;
}

export const QrScanner: React.FC<QrScannerProps> = ({ onScan, onError, active = true }) => {
  const [divId] = useState(() => 'qr-scanner-' + Math.random().toString(36).substring(2, 9));

  useEffect(() => {
    if (!active) return;
    
    let isUnmounted = false;
    let scanner: Html5Qrcode | null = null;
    let startPromise: Promise<any> | null = null;

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode(divId);
        startPromise = scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (text) => {
            if (!isUnmounted) onScan(text);
          },
          (errorMessage) => {
             // Ignoring frame-by-frame read errors to avoid spamming the console
          }
        );
        await startPromise;
      } catch (err) {
        if (!isUnmounted && onError) {
          onError(String(err));
        }
      }
    };

    startScanner();

    return () => {
      isUnmounted = true;
      if (scanner && startPromise) {
        startPromise.then(() => {
          if (scanner && scanner.isScanning) {
            scanner.stop()
              .then(() => scanner?.clear())
              .catch(() => {});
          }
        }).catch(() => {});
      }
    };
  }, [active, divId, onScan, onError]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div id={divId} className="w-full max-w-sm rounded-[1rem] overflow-hidden" style={{ minHeight: '300px', backgroundColor: '#000' }} />
      <p className="text-gray-400 text-sm text-center animate-pulse">Point camera directly at the QR code</p>
    </div>
  );
};
