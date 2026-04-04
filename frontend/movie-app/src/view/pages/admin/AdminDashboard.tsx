import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchAllBookings, fetchAllStaff } from '../../../viewmodel/slices/adminSlice';
import { adminApi } from '../../../model/api/adminApi';
import { Header } from '../../components/layout/Header';
import { Loading } from '../../components/common/Loading';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';

// ── Quick stat card ───────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string; value: number | string; color: string; icon: string;
}> = ({ label, value, color, icon }) => (
  <div className={`bg-gray-900 border ${color} rounded-xl p-5`}>
    <div className="flex items-center justify-between mb-2">
      <p className="text-gray-500 text-xs uppercase tracking-wider">{label}</p>
      <span className="text-xl">{icon}</span>
    </div>
    <p className="text-3xl font-bold text-white">{value}</p>
  </div>
);

// ── Nav card ─────────────────────────────────────────────────────────────────

const NavCard: React.FC<{
  to: string; title: string; desc: string; icon: string;
  badge?: string; badgeColor?: string;
}> = ({ to, title, desc, icon, badge, badgeColor }) => (
  <Link to={to}
    className="bg-gray-900 border border-gray-800 hover:border-red-700 rounded-xl p-5
      transition-all duration-200 flex items-start gap-4 group">
    <span className="text-3xl group-hover:scale-110 transition-transform">{icon}</span>
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <p className="text-white font-semibold group-hover:text-red-400 transition-colors">
          {title}
        </p>
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-gray-500 text-sm mt-0.5">{desc}</p>
    </div>
  </Link>
);

// ── Component ─────────────────────────────────────────────────────────────────

export const AdminDashboard: React.FC = () => {
  const dispatch   = useDispatch<AppDispatch>();
  const navigate   = useNavigate();
  const { showToast } = useToast();
  const { bookings, staff, loading } = useSelector((s: RootState) => s.admin);

  const [resyncLoading, setResyncLoading] = useState(false);
  const [showtimeInput, setShowtimeInput] = useState('');
  const [resyncScreenInput, setResyncScreenInput] = useState('');

  useEffect(() => {
    dispatch(fetchAllBookings());
    dispatch(fetchAllStaff());
  }, [dispatch]);

  // Booking status counts
  const confirmedCount  = bookings.filter(b => b.status === 'CONFIRMED').length;
  const checkedInCount  = bookings.filter(b => b.status === 'CHECKED_IN').length;
  const completedCount  = bookings.filter(b => b.status === 'COMPLETED').length;
  const cancelledCount  = bookings.filter(b => b.status === 'CANCELLED' || b.status === 'EXPIRED').length;

  const handleResync = async () => {
    const screenId   = Number(resyncScreenInput);
    const showtimeId = Number(showtimeInput);
    if (!screenId || !showtimeId) {
      showToast('Enter both Screen ID and Showtime ID to resync', 'error');
      return;
    }
    try {
      setResyncLoading(true);
      const result = await adminApi.resyncLeds(screenId, showtimeId);
      showToast(`✅ ${result.message}`, 'success');
    } catch {
      showToast('LED resync failed. Check MQTT connection.', 'error');
    } finally {
      setResyncLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">CinePlex management centre</p>
          </div>
        </div>

        {loading ? <Loading /> : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total Bookings" value={bookings.length}
                color="border-gray-700" icon="🎟️" />
              <StatCard label="Confirmed"      value={confirmedCount}
                color="border-blue-800"  icon="✅" />
              <StatCard label="In Hall"        value={checkedInCount}
                color="border-purple-800" icon="🚶" />
              <StatCard label="Completed"      value={completedCount}
                color="border-green-800" icon="🎬" />
            </div>

            {/* Management links */}
            <h2 className="text-gray-500 text-xs uppercase tracking-wider mb-3">Management</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
              <NavCard to="/admin/movies"    icon="🎥"
                title="Movies"    desc="Add, edit and remove movies" />
              <NavCard to="/admin/showtimes" icon="📅"
                title="Showtimes" desc="Schedule and manage screenings" />
              <NavCard to="/admin/staff"     icon="👥"
                title="Staff"     desc="Register and manage staff accounts" />
              <NavCard to="/admin/kiosks"    icon="📟"
                title="Kiosks"    desc="Register kiosk devices and API keys" />
            </div>

            {/* Live tracking section */}
            <h2 className="text-gray-500 text-xs uppercase tracking-wider mb-3">
              Real-Time IoT Tracking
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">

              {/* Navigate to tracking */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-3xl">📡</span>
                  <div>
                    <p className="text-white font-semibold">Live Customer Tracking</p>
                    <p className="text-gray-500 text-sm">
                      Monitor which customers have entered the hall and who has confirmed their seat.
                      LED status shown in real-time.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    value={showtimeInput}
                    onChange={e => setShowtimeInput(e.target.value)}
                    placeholder="Showtime ID"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                      text-white text-sm focus:outline-none focus:border-red-500"
                  />
                  <Button
                    onClick={() => showtimeInput && navigate(`/admin/tracking/${showtimeInput}`)}
                    disabled={!showtimeInput}
                  >
                    Open Tracking
                  </Button>
                </div>
              </div>

              {/* LED Resync */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-3xl">💡</span>
                  <div>
                    <p className="text-white font-semibold">Resync LED States</p>
                    <p className="text-gray-500 text-sm">
                      After an ESP32 reboot or WiFi drop, republish all LED patterns
                      from the database to restore correct hardware state.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    value={resyncScreenInput}
                    onChange={e => setResyncScreenInput(e.target.value)}
                    placeholder="Screen ID"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                      text-white text-sm focus:outline-none focus:border-red-500"
                  />
                  <input
                    value={showtimeInput}
                    onChange={e => setShowtimeInput(e.target.value)}
                    placeholder="Showtime ID"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                      text-white text-sm focus:outline-none focus:border-red-500"
                  />
                  <Button
                    onClick={handleResync}
                    loading={resyncLoading}
                    variant="secondary"
                  >
                    Resync
                  </Button>
                </div>
              </div>
            </div>

            {/* Recent bookings quick view */}
            <h2 className="text-gray-500 text-xs uppercase tracking-wider mb-3">
              Recent Bookings
            </h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {bookings.length === 0 ? (
                <p className="text-gray-600 text-sm text-center p-8">No bookings yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">Movie</th>
                      <th className="px-4 py-3 text-left">Screen</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.slice(0, 10).map(b => (
                      <tr key={b.id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">
                          {b.bookingCode}
                        </td>
                        <td className="px-4 py-3 text-white text-xs">{b.movieTitle}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{b.screenName}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            b.status === 'CONFIRMED'  ? 'bg-blue-900 text-blue-300'   :
                            b.status === 'CHECKED_IN' ? 'bg-purple-900 text-purple-300' :
                            b.status === 'COMPLETED'  ? 'bg-green-900 text-green-300' :
                            b.status === 'CANCELLED'  ? 'bg-gray-800 text-gray-500'   :
                            'bg-yellow-900 text-yellow-300'
                          }`}>{b.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-red-400 text-xs font-semibold">
                          LKR {b.totalAmount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </>
        )}
      </main>
    </div>
  );
};