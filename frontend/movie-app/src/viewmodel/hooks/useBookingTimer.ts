import { useState, useEffect } from 'react';

/**
 * Counts down from expiresAt to now.
 * Returns formatted "MM:SS" string and whether the booking has expired.
 */
export const useBookingTimer = (expiresAt: string | null) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt) return;

    const calc = () => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(Math.max(diff, 0));
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return {
    display: `${mm}:${ss}`,
    expired: secondsLeft === 0 && !!expiresAt,
    urgent: secondsLeft < 60 && secondsLeft > 0,
  };
};