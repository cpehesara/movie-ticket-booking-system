import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchMyBookings, cancelBooking } from '../../../viewmodel/slices/bookingSlice';
import { BookingResponse, BookedSeatInfo } from '../../../model/types/booking.types';
import { useToast } from '../../components/common/Toast';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Loading } from '../../components/common/Loading';
import { Button } from '../../components/common/Button';

const statusColors: Record<string, string> = {
  PENDING:    'bg-yellow-900 text-yellow-300',
  CONFIRMED:  'bg-blue-900 text-blue-300',
  CHECKED_IN: 'bg-purple-900 text-purple-300',
  COMPLETED:  'bg-green-900 text-green-300',
  CANCELLED:  'bg-gray-800 text-gray-400',
  EXPIRED:    'bg-red-950 text-red-400',
};

export const BookingHistoryPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { bookings, loading } = useSelector((s: RootState) => s.bookings);
  const { showToast } = useToast();

  useEffect(() => { dispatch(fetchMyBookings()); }, [dispatch]);

  const handleCancel = async (id: number) => {
    const res = await dispatch(cancelBooking(id));
    if (cancelBooking.fulfilled.match(res)) showToast('Booking cancelled', 'success');
    else showToast(res.payload as string, 'error');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">My Bookings</h1>
        {loading ? <Loading /> : bookings.length === 0
          ? <p className="text-gray-500 text-center py-16">No bookings yet.</p>
          : (
            <div className="flex flex-col gap-4">
              {bookings.map((b: BookingResponse) => (
                <div key={b.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold">{b.movieTitle}</h3>
                      <p className="text-gray-500 text-sm">{b.screenName} · {b.cinemaName}</p>
                      <p className="text-gray-500 text-sm">{new Date(b.startTime).toLocaleString()}</p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusColors[b.status]}`}>
                      {b.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">
                        Seats: <span className="text-white">
                          {b.seats.map((s: BookedSeatInfo) => `${s.rowLabel}${s.colNumber}`).join(', ')}
                        </span>
                      </p>
                      <p className="text-gray-400 text-sm font-mono">{b.bookingCode}</p>
                      <p className="text-red-400 font-semibold text-sm">LKR {b.totalAmount}</p>
                    </div>
                    {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                      <Button variant="danger" size="sm" onClick={() => handleCancel(b.id)}>Cancel</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </main>
      <Footer />
    </div>
  );
};