import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { wsService } from '../../model/services/webSocketService';
import { applySeatUpdate } from '../slices/seatSlice';
import { SeatWebSocketUpdate } from '../../model/types/seat.types';

export const useWebSocket = (showtimeId: number | null) => {
  const dispatch = useDispatch<AppDispatch>();
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!showtimeId) return;

    const init = async () => {
      if (!wsService.isConnected()) {
        await wsService.connect().catch(() => {});
      }
      unsubRef.current = wsService.subscribeSeatMap(
        showtimeId,
        (update: SeatWebSocketUpdate) => dispatch(applySeatUpdate(update))
      );
    };

    init();

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [showtimeId, dispatch]);
};