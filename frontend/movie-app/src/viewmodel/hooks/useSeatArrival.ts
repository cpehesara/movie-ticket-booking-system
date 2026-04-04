import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { confirmSeatArrival, reset } from '../slices/checkinSlice';

export const useSeatArrival = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { result, loading, error } = useSelector((s: RootState) => s.checkin);

  /**
   * Called when customer scans the physical QR label on their seat.
   * Accepts both legacy SEAT:{id} and new HMAC format SEAT:{id}:{screenId}:{row}:{col}:{hmac}.
   */
  const confirmArrival = (rawQr: string) => {
    if (!rawQr.trim().startsWith('SEAT:')) {
      return Promise.reject(new Error('Not a seat QR code'));
    }
    return dispatch(confirmSeatArrival(rawQr.trim()));
  };

  return { result, loading, error, confirmArrival, reset: () => dispatch(reset()) };
};
