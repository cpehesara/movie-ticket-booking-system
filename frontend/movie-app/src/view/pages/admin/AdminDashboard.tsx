import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchAllBookings } from '../../../viewmodel/slices/adminSlice';
import { BookingResponse } from '../../../model/types/booking.types';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { Loading } from '../../components/common/Loading';

const statusColors: Record<string, string> = {
  PENDING: 'text-yellow-400', CONFIRMED: 'text-blue-400',
  CHECKED_IN: 'text-purple-400', COMPLETED: 'text-green-400',
  CANCELLED: 'text-gray-500', EXPIRED: 'text-red-400',
};

export const AdminDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { bookings, loading } = useSelector((s: RootState) => s.admin);

  useEffect(() => { dispatch(fetchAllBookings()); }, [dispatch]);

  const counts = bookings.reduce<Record<string, number>>(
    (acc: Record<string, number>, b: BookingResponse) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    },
    {}
  );

  const revenue = bookings
    .filter((b: BookingResponse) => b.status !== 'CANCELLED' && b.status !== 'EXPIRED')
    .reduce((sum: number, b: BookingResponse) => sum + Number(b.totalAmount), 0);

  const stats = [
    { label: 'Total Bookings', value: bookings.length, icon: '🎟' },
    { label: 'Confirmed', value: counts['CONFIRMED'] || 0, icon: '✅' },
    { label: 'Checked In', value: counts['CHECKED_IN'] || 0, icon: '🪑' },
    { label: 'Revenue (LKR)', value: revenue.toFixed(0), icon: '💰' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map(s => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-2xl mb-1">{s.icon}</p>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-gray-500 text-sm">{s.label}</p>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-semibold text-white mb-4">Recent Bookings</h2>
          {loading ? <Loading /> : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Code', 'Movie', 'Seats', 'Amount', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 20).map((b: BookingResponse) => (
                    <tr key={b.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-mono text-gray-300">{b.bookingCode}</td>
                      <td className="px-4 py-3 text-white">{b.movieTitle}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {b.seats.map(s => `${s.rowLabel}${s.colNumber}`).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-red-400">LKR {b.totalAmount}</td>
                      <td className={`px-4 py-3 font-semibold ${statusColors[b.status]}`}>{b.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};