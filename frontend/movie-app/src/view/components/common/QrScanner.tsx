import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  active?: boolean;
}

export const QrScanner: React.FC<QrScannerProps> = ({ onScan, onError, active = true }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const divId = 'qr-scanner-region';

  useEffect(() => {
    if (!active) return;

    const scanner = new Html5Qrcode(divId);
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (text) => { onScan(text); },
      () => {}  // suppress per-frame errors
    ).catch((e) => onError?.(String(e)));

    return () => {
      scanner.isScanning && scanner.stop().catch(() => {});
    };
  }, [active]); // eslint-disable-line

  return (
    <div className="flex flex-col items-center gap-4">
      <div id={divId} className="w-full max-w-xs rounded-xl overflow-hidden border-2 border-red-600" />
      <p className="text-gray-400 text-sm text-center">Point camera at QR code</p>
    </div>
  );
};