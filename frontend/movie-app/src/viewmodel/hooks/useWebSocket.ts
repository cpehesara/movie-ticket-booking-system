import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { wsService } from '../../model/services/webSocketService';
import { applySeatUpdate } from '../slices/seatSlice';
import { receiveEvent, markInTransit, clearInTransit } from '../slices/iotSlice';
import { SeatWebSocketUpdate } from '../../model/types/seat.types';
import { IoTEvent } from '../../model/types/iot_types';

interface Options {
  /** When true, also subscribes to the IoT event topic for this showtime. */
  subscribeIoT?: boolean;
}

/**
 * useWebSocket — connects to the STOMP/SockJS WebSocket server and subscribes
 * to real-time seat map updates for a given showtime.
 *
 * Design pattern: Observer — this hook acts as the client-side observer,
 * receiving server-sent events and dispatching them into the Redux store so
 * every mounted component reflects the current state without polling.
 */
export const useWebSocket = (showtimeId: number | null, options: Options = {}) => {
  const dispatch       = useDispatch<AppDispatch>();
  const unsubSeatRef   = useRef<(() => void) | null>(null);
  const unsubIoTRef    = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!showtimeId) return;

    const init = async () => {
      if (!wsService.isConnected()) {
        await wsService.connect().catch(() => {});
      }

      // Seat state subscription — always active
      unsubSeatRef.current = wsService.subscribeSeatMap(
        showtimeId,
        (update: SeatWebSocketUpdate) => {
          dispatch(applySeatUpdate(update));
          // Clear in-transit flag when seat becomes OCCUPIED
          if (update.seatState === 'OCCUPIED') {
            dispatch(clearInTransit(update.seatId));
          }
        }
      );

      // IoT event subscription — opt-in (used by IoTMonitorPage & display board)
      if (options.subscribeIoT) {
        unsubIoTRef.current = wsService.subscribeIoTEvents(
          showtimeId,
          (event: IoTEvent) => {
            dispatch(receiveEvent(event));
            if (event.type === 'DOOR_SCAN' && event.seatId) {
              dispatch(markInTransit([event.seatId]));
            }
          }
        );
      }
    };

    init();

    return () => {
      unsubSeatRef.current?.();
      unsubIoTRef.current?.();
      unsubSeatRef.current = null;
      unsubIoTRef.current  = null;
    };
  }, [showtimeId, options.subscribeIoT, dispatch]); // eslint-disable-line
};