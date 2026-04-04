import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../viewmodel/store';
import { useAuth } from '../../../viewmodel/hooks/useAuth';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const esp32Online    = useSelector((s: RootState) => s.iot.esp32.online);
  const inTransitCount = useSelector((s: RootState) => s.iot.inTransitSeatIds.length);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        backgroundColor: 'rgba(8,11,16,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #111827',
      }}
    >
      <div
        className="max-w-7xl mx-auto px-5 flex items-center justify-between"
        style={{ height: '3.75rem' }}
      >
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2 font-black tracking-widest uppercase"
          style={{ color: '#dc2626', fontSize: '0.9rem', letterSpacing: '0.25em', textDecoration: 'none' }}
        >
          CinePlex
        </Link>

        <nav className="flex items-center gap-1">
          {isAuthenticated ? (
            <>
              {user?.role === 'CUSTOMER' && (
                <>
                  <NavLink to="/movies">Movies</NavLink>
                  <NavLink to="/bookings">My Bookings</NavLink>
                  <NavLink to="/profile">Profile</NavLink>
                    <NavLink to="/scan-seat">
                      <span className="flex items-center gap-1">
                        📷 Scan Seat
                      </span>
                    </NavLink>
                  </>
                )}

                {isAdmin && (
                  <>
                  <NavLink to="/admin">Dashboard</NavLink>
                  <NavLink to="/admin/iot-monitor">
                    <span className="flex items-center gap-1.5">
                      IoT Monitor
                      {/* Live/offline dot */}
                      <span
                        className="w-1.5 h-1.5 rounded-full inline-block"
                        style={{
                          backgroundColor: esp32Online ? '#4ade80' : '#374151',
                          boxShadow: esp32Online ? '0 0 4px #4ade80' : 'none',
                        }}
                      />
                      {/* In-transit badge */}
                      {inTransitCount > 0 && (
                        <span
                          className="rounded-full font-bold"
                          style={{
                            backgroundColor: '#f97316',
                            color: '#fff',
                            fontSize: '0.55rem',
                            padding: '1px 5px',
                            boxShadow: '0 0 6px rgba(249,115,22,0.6)',
                          }}
                        >
                          {inTransitCount}
                        </span>
                      )}
                    </span>
                  </NavLink>
                </>
              )}

              {/* User chip */}
              <div
                className="flex items-center gap-2 ml-2 pl-3"
                style={{ borderLeft: '1px solid #1f2937' }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
                  style={{ backgroundColor: '#7f1d1d', fontSize: '0.65rem' }}
                >
                  {user?.fullName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <span style={{ color: '#4b5563', fontSize: '0.75rem', maxWidth: '8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.fullName}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs px-2.5 py-1.5 rounded-lg transition-all font-medium"
                  style={{
                    backgroundColor: '#111827',
                    color: '#6b7280',
                    border: '1px solid #1f2937',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#1f2937';
                    e.currentTarget.style.color = '#d1d5db';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = '#111827';
                    e.currentTarget.style.color = '#6b7280';
                  }}
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login">Login</NavLink>
              <Link
                to="/register"
                className="ml-1 text-sm font-semibold px-4 py-1.5 rounded-lg transition-all"
                style={{ backgroundColor: '#dc2626', color: '#fff' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#b91c1c')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#dc2626')}
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

// ─── Minimal nav link ─────────────────────────────────────────────────────────

const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link
    to={to}
    className="text-sm px-3 py-1.5 rounded-lg transition-all"
    style={{ color: '#6b7280', textDecoration: 'none' }}
    onMouseEnter={e => {
      e.currentTarget.style.color = '#d1d5db';
      e.currentTarget.style.backgroundColor = '#111827';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.color = '#6b7280';
      e.currentTarget.style.backgroundColor = 'transparent';
    }}
  >
    {children}
  </Link>
);