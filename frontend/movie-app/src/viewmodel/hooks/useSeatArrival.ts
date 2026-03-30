import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { confirmSeatArrival, reset } from '../slices/checkinSlice';

export const useSeatArrival = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { result, loading, error } = useSelector((s: RootState) => s.checkin);

  /**
   * Called when customer scans the physical QR label on their seat.
   * QR content format: "SEAT:{seatId}" — this hook strips the prefix.
   */
  const confirmArrival = (bookingCode: string, rawQr: string) => {
    const match = rawQr.match(/^SEAT:(\d+)$/);
    if (!match) {
      return Promise.reject(new Error('Invalid seat QR code. Expected format: SEAT:{id}'));
    }
    const seatId = parseInt(match[1], 10);
    return dispatch(confirmSeatArrival({ bookingCode, seatId }));
  };

  return { result, loading, error, confirmArrival, reset: () => dispatch(reset()) };
};