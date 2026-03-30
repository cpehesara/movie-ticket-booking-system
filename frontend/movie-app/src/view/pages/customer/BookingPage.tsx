import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchSeatMap, clearSeatMap } from '../../../viewmodel/slices/seatSlice';
import { createBooking, clearCurrent } from '../../../viewmodel/slices/bookingSlice';
import { useWebSocket } from '../../../viewmodel/hooks/useWebSocket';
import { useBookingTimer } from '../../../viewmodel/hooks/useBookingTimer';
import { useToast } from '../../components/common/Toast';
import { SeatGrid } from '../../components/seat-map/SeatGrid';
import { SeatLegend } from '../../components/seat-map/SeatLegend';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';
import { Header } from '../../components/layout/Header';
import { Modal } from '../../components/common/Modal';

export const BookingPage: React.FC = () => {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const id = Number(showtimeId);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { seatMap, selectedSeatIds, loading: seatLoading } = useSelector((s: RootState) => s.seats);
  const { current, loading: bookingLoading, error } = useSelector((s: RootState) => s.bookings);

  useWebSocket(id);
  const { display, expired, urgent } = useBookingTimer(current?.expiresAt ?? null);

  useEffect(() => {
    dispatch(fetchSeatMap(id));
    return () => { dispatch(clearSeatMap()); dispatch(clearCurrent()); };
  }, [id, dispatch]);

  useEffect(() => {
    if (error) showToast(error, 'error');
  }, [error, showToast]);

  const handleBook = () => {
    dispatch(createBooking({ showtimeId: id, seatIds: selectedSeatIds, paymentMethod: 'CARD' }));
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {seatLoading ? <Loading message="Loading seat map..." /> : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-white">{seatMap?.screenName}</h1>
                <p className="text-gray-500 text-sm">
                  {seatMap?.availableCount} of {seatMap?.totalSeats} seats available
                </p>
              </div>
              {current && (
                <div className={`text-center ${urgent ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
                  <p className="text-xs text-gray-500">Reservation expires in</p>
                  <p className="text-2xl font-mono font-bold">{display}</p>
                </div>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6 overflow-x-auto">
              <SeatGrid />
              <SeatLegend />
            </div>

            {selectedSeatIds.length > 0 && !current && (
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{selectedSeatIds.length} seat(s) selected</p>
                  <p className="text-gray-500 text-sm">
                    LKR {((seatMap?.totalSeats ?? 0) > 0 && seatMap?.availableCount !== undefined)
                      ? 'See total at checkout'
                      : '—'}
                  </p>
                </div>
                <Button onClick={handleBook} loading={bookingLoading}>Reserve & Pay</Button>
              </div>
            )}
          </>
        )}
      </main>

      <Modal open={!!current && !expired} onClose={() => {}} title="Booking Confirmed!">
        <div className="flex flex-col items-center gap-4">
          {current?.qrCodeBase64 && (
            <img src={`data:image/png;base64,${current.qrCodeBase64}`}
              alt="Booking QR" className="w-48 h-48 border-4 border-red-600 rounded-xl" />
          )}
          <p className="text-white font-mono text-lg font-bold">{current?.bookingCode}</p>
          <p className="text-gray-400 text-sm text-center">
            Scan this at the entrance kiosk. Valid for 7 minutes.
          </p>
          <Button onClick={() => navigate('/bookings')} variant="secondary" fullWidth>
            View My Bookings
          </Button>
        </div>
      </Modal>
    </div>
  );
};