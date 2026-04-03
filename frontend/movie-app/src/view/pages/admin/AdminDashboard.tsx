import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchAllBookings } from '../../../viewmodel/slices/adminSlice';
import { BookingResponse } from '../../../model/types/booking.types';
import { Header, Sidebar } from '../../components/layout';
import { Loading } from '../../components/common/Loading';

const statusBadge: Record<string, { bg: string; text: string }> = {
  PENDING:    { bg: 'rgba(234,179,8,0.12)',   text: '#facc15' },
  CONFIRMED:  { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa' },
  CHECKED_IN: { bg: 'rgba(168,85,247,0.12)',  text: '#c084fc' },
  COMPLETED:  { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80' },
  CANCELLED:  { bg: 'rgba(75,85,99,0.15)',    text: '#6b7280' },
  EXPIRED:    { bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
};

export const AdminDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { bookings, loading } = useSelector((s: RootState) => s.admin);
  const { inTransitSeatIds, esp32, events } = useSelector((s: RootState) => s.iot);

  useEffect(() => { dispatch(fetchAllBookings()); }, [dispatch]);

  const counts = bookings.reduce<Record<string, number>>(
    (acc, b: BookingResponse) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; },
    {}
  );

  const revenue = bookings
    .filter(b => b.status !== 'CANCELLED' && b.status !== 'EXPIRED')
    .reduce((sum, b) => sum + Number(b.totalAmount), 0);

  const statCards = [
    { label: 'Total Bookings',  value: bookings.length,          accent: '#9ca3af' },
    { label: 'Confirmed',       value: counts['CONFIRMED'] || 0,  accent: '#60a5fa' },
    { label: 'Checked In',      value: counts['CHECKED_IN'] || 0, accent: '#c084fc' },
    { label: 'Revenue (LKR)',   value: `${revenue.toFixed(0)}`,   accent: '#4ade80' },
  ];

  const iotCards = [
    {
      label: 'In Transit',
      value: inTransitSeatIds.length,
      accent: inTransitSeatIds.length > 0 ? '#fb923c' : '#374151',
      glow: inTransitSeatIds.length > 0,
      desc: 'customers walking to seat',
    },
    {
      label: 'ESP32',
      value: esp32.online ? 'Online' : 'Offline',
      accent: esp32.online ? '#4ade80' : '#f87171',
      glow: false,
      desc: esp32.lastHeartbeat
        ? `Last ping ${new Date(esp32.lastHeartbeat).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'No heartbeat received',
    },
    {
      label: 'IoT Events',
      value: events.length,
      accent: '#a78bfa',
      glow: false,
      desc: 'in current session',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
      <Header />
      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-8" style={{ minWidth: 0 }}>

          {/* Page header */}
          <div className="flex items-center justify-between mb-7">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
              <p style={{ color: '#4b5563', fontSize: '0.78rem', marginTop: '2px' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <Link
              to="/admin/iot-monitor"
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: 'rgba(220,38,38,0.12)',
                color: '#f87171',
                border: '1px solid rgba(220,38,38,0.25)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse inline-block"
                style={{ backgroundColor: '#f87171', boxShadow: '0 0 5px #f87171' }}
              />
              Open IoT Monitor
            </Link>
          </div>

          {/* Booking stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {statCards.map(s => (
              <div
                key={s.label}
                className="rounded-xl p-5"
                style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
              >
                <p className="text-2xl font-bold font-mono" style={{ color: s.accent }}>{s.value}</p>
                <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '4px' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* IoT stats */}
          <div className="grid grid-cols-3 gap-3 mb-7">
            {iotCards.map(s => (
              <div
                key={s.label}
                className="rounded-xl p-5"
                style={{
                  backgroundColor: '#0d1117',
                  border: `1px solid ${s.glow ? 'rgba(251,146,60,0.3)' : '#1f2937'}`,
                  boxShadow: s.glow ? '0 0 20px rgba(251,146,60,0.08)' : 'none',
                }}
              >
                <div className="flex items-end justify-between">
                  <p
                    className="text-2xl font-bold font-mono"
                    style={{
                      color: s.accent,
                      textShadow: s.glow ? `0 0 12px ${s.accent}` : 'none',
                    }}
                  >
                    {s.value}
                  </p>
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ backgroundColor: '#111827', color: '#374151' }}
                  >
                    IoT
                  </span>
                </div>
                <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '4px' }}>{s.label}</p>
                <p style={{ color: '#374151', fontSize: '0.68rem', marginTop: '2px' }}>{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Recent bookings table */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white">Recent Bookings</h2>
            <span style={{ color: '#374151', fontSize: '0.72rem' }}>
              Showing last {Math.min(bookings.length, 20)}
            </span>
          </div>

          {loading ? <Loading /> : (
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #1f2937' }}>
                    {['Code', 'Movie', 'Seats', 'Amount', 'Status'].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left font-medium"
                        style={{ color: '#4b5563', fontSize: '0.72rem', letterSpacing: '0.05em' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 20).map((b: BookingResponse, i) => {
                    const badge = statusBadge[b.status] ?? { bg: 'transparent', text: '#9ca3af' };
                    return (
                      <tr
                        key={b.id}
                        style={{
                          borderBottom: i < 19 ? '1px solid #111827' : 'none',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111827')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td className="px-4 py-3 font-mono" style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                          {b.bookingCode}
                        </td>
                        <td className="px-4 py-3 text-white text-sm font-medium">{b.movieTitle}</td>
                        <td className="px-4 py-3" style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                          {b.seats.map(s => `${s.rowLabel}${s.colNumber}`).join(', ')}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#f87171', fontSize: '0.8rem' }}>
                          LKR {b.totalAmount}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: badge.bg, color: badge.text }}
                          >
                            {b.status}
                          </span>
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
