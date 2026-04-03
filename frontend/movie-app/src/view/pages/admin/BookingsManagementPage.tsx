import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchAllBookings } from '../../../viewmodel/slices/adminSlice';
import { BookingResponse } from '../../../model/types/booking.types';
import { Header } from '../../components/layout/Header';
import { Sidebar } from '../../components/layout/Sidebar';
import { Loading } from '../../components/common/Loading';

const statusBadge: Record<string, { bg: string; text: string }> = {
  PENDING:    { bg: 'rgba(234,179,8,0.12)',   text: '#facc15' },
  CONFIRMED:  { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa' },
  CHECKED_IN: { bg: 'rgba(168,85,247,0.12)',  text: '#c084fc' },
  COMPLETED:  { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80' },
  CANCELLED:  { bg: 'rgba(75,85,99,0.15)',    text: '#6b7280' },
  EXPIRED:    { bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
};

const ALL_STATUSES = ['ALL','PENDING','CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED','EXPIRED'];

export const BookingsManagementPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { bookings, loading } = useSelector((s: RootState) => s.admin);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => { dispatch(fetchAllBookings()); }, [dispatch]);

  const filtered = bookings.filter((b: BookingResponse) => {
    const matchStatus = filter === 'ALL' || b.status === filter;
    const matchSearch = !search ||
      b.bookingCode.toLowerCase().includes(search.toLowerCase()) ||
      b.movieTitle.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const revenue = bookings
    .filter(b => b.status !== 'CANCELLED' && b.status !== 'EXPIRED')
    .reduce((sum, b) => sum + Number(b.totalAmount), 0);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8" style={{ minWidth: 0 }}>

          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                All Bookings
              </h1>
              <p style={{ color: '#4b5563', fontSize: '0.78rem', marginTop: '2px' }}>
                {bookings.length} total bookings · LKR {revenue.toFixed(0)} revenue
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {['PENDING','CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED','EXPIRED'].map(s => {
              const count = bookings.filter(b => b.status === s).length;
              const badge = statusBadge[s];
              return (
                <div key={s} className="rounded-xl p-4 text-center"
                  style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}>
                  <p className="text-xl font-bold font-mono"
                    style={{ color: badge.text }}>{count}</p>
                  <p style={{ color: '#4b5563', fontSize: '0.65rem', marginTop: '3px' }}>
                    {s}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="flex items-center gap-2 rounded-xl px-4"
              style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}>
              <span style={{ color: '#374151' }}>⌕</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by code or movie..."
                className="bg-transparent py-2.5 text-sm text-white focus:outline-none"
                style={{ width: 220, caretColor: '#dc2626' }}
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {ALL_STATUSES.map(s => {
                const active = filter === s;
                const badge = statusBadge[s];
                return (
                  <button key={s} onClick={() => setFilter(s)}
                    className="text-xs px-3 py-2 rounded-lg font-medium transition-all"
                    style={{
                      backgroundColor: active
                        ? (badge?.bg ?? 'rgba(220,38,38,0.15)') : 'transparent',
                      color: active ? (badge?.text ?? '#f87171') : '#4b5563',
                      border: `1px solid ${active
                        ? ((badge?.text ?? '#f87171') + '40') : 'transparent'}`,
                      cursor: 'pointer',
                    }}>
                    {s}
                    <span className="ml-1 opacity-60">
                      {s === 'ALL'
                        ? bookings.length
                        : bookings.filter(b => b.status === s).length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          {loading ? <Loading /> : (
            <div className="rounded-xl overflow-hidden"
              style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #1f2937' }}>
                    {['Code','Movie','Screen','Seats','Amount','Status','Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium"
                        style={{ color: '#4b5563', fontSize: '0.72rem',
                          letterSpacing: '0.05em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center"
                        style={{ color: '#374151', fontSize: '0.85rem' }}>
                        No bookings found.
                      </td>
                    </tr>
                  ) : filtered.map((b: BookingResponse, i) => {
                    const badge = statusBadge[b.status]
                      ?? { bg: 'transparent', text: '#9ca3af' };
                    return (
                      <tr key={b.id}
                        style={{
                          borderBottom: i < filtered.length - 1
                            ? '1px solid #111827' : 'none',
                        }}
                        onMouseEnter={e =>
                          (e.currentTarget.style.backgroundColor = '#111827')}
                        onMouseLeave={e =>
                          (e.currentTarget.style.backgroundColor = 'transparent')}>
                        <td className="px-4 py-3 font-mono"
                          style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                          {b.bookingCode}
                        </td>
                        <td className="px-4 py-3 text-white font-medium text-sm">
                          {b.movieTitle}
                        </td>
                        <td className="px-4 py-3"
                          style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                          {b.screenName}
                        </td>
                        <td className="px-4 py-3 font-mono"
                          style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                          {b.seats.map(s => `${s.rowLabel}${s.colNumber}`).join(', ')}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold"
                          style={{ color: '#f87171', fontSize: '0.8rem' }}>
                          LKR {b.totalAmount}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: badge.bg, color: badge.text }}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3"
                          style={{ color: '#4b5563', fontSize: '0.75rem' }}>
                          {new Date(b.bookedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};