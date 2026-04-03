import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../viewmodel/store';
import { useAuth } from '../../../viewmodel/hooks/useAuth';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const esp32Online = useSelector((s: RootState) => s.iot.esp32.online);
  const inTransitCount = useSelector((s: RootState) => s.iot.inTransitSeatIds.length);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isCustomer = user?.role === 'CUSTOMER';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const customerLinks = [
    { to: '/', label: 'Home' },
    { to: '/movies', label: 'Movies' },
    { to: '/profile', label: 'Cinemas' },
    { to: '/bookings', label: 'Experience' },
  ];

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        backgroundColor: 'rgba(8,11,16,0.96)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #111827',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 md:px-5">
        {isCustomer || !isAuthenticated ? (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 md:gap-5 lg:gap-7 flex-wrap">
              <Link
                to="/"
                className="flex items-center gap-2 font-black uppercase tracking-[0.22em]"
                style={{ color: '#dc2626', textDecoration: 'none', fontSize: '0.88rem' }}
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}
                >
                  <span className="text-sm">[]</span>
                </span>
                CinePlex
              </Link>

              <nav className="flex items-center gap-1 flex-wrap">
                {customerLinks.map((link) => {
                  const active = location.pathname === link.to;
                  return (
                    <CustomerNavLink key={link.label} to={link.to} active={active}>
                      {link.label}
                    </CustomerNavLink>
                  );
                })}

                <Link
                  to="/movies"
                  className="text-sm font-semibold px-4 py-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    textDecoration: 'none',
                    boxShadow: '0 8px 20px rgba(220,38,38,0.22)',
                  }}
                >
                  Book Now
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap lg:justify-end">
              <div
                className="flex items-center rounded-xl px-3 py-2 min-w-[15rem] flex-1 lg:flex-none lg:w-[18rem]"
                style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}
              >
                <input
                  type="text"
                  placeholder="Search movies or bookings"
                  className="w-full bg-transparent text-sm outline-none"
                  style={{ color: '#f3f4f6' }}
                />
                <span style={{ color: '#6b7280', fontSize: '1rem' }}>Q</span>
              </div>

              <div className="px-1 hidden md:block">
                <p className="text-[0.62rem] uppercase tracking-[0.24em]" style={{ color: '#6b7280' }}>
                  Hotline
                </p>
                <p className="text-xs font-semibold text-white">011 2564934</p>
              </div>

              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link
                    to="/profile"
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{
                      textDecoration: 'none',
                      background: 'linear-gradient(135deg, #7f1d1d, #dc2626)',
                      border: '1px solid rgba(220,38,38,0.3)',
                    }}
                    title={user?.fullName ?? 'Profile'}
                  >
                    {user?.fullName?.[0]?.toUpperCase() ?? '?'}
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="text-sm font-semibold px-4 py-2 rounded-lg transition-all"
                    style={{
                      backgroundColor: '#111827',
                      color: '#f3f4f6',
                      border: '1px solid #1f2937',
                    }}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="text-sm font-semibold px-4 py-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    textDecoration: 'none',
                    boxShadow: '0 8px 20px rgba(220,38,38,0.22)',
                  }}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between" style={{ minHeight: '3.75rem' }}>
            <Link
              to="/"
              className="flex items-center gap-2 font-black tracking-widest uppercase"
              style={{ color: '#dc2626', fontSize: '0.9rem', letterSpacing: '0.25em', textDecoration: 'none' }}
            >
              CinePlex
            </Link>

            <nav className="flex items-center gap-1">
              {isAdmin && (
                <>
                  <AdminNavLink to="/admin">Dashboard</AdminNavLink>
                  <AdminNavLink to="/admin/iot-monitor">
                    <span className="flex items-center gap-1.5">
                      IoT Monitor
                      <span
                        className="w-1.5 h-1.5 rounded-full inline-block"
                        style={{
                          backgroundColor: esp32Online ? '#4ade80' : '#374151',
                          boxShadow: esp32Online ? '0 0 4px #4ade80' : 'none',
                        }}
                      />
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
                  </AdminNavLink>
                </>
              )}

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
                <span
                  style={{
                    color: '#4b5563',
                    fontSize: '0.75rem',
                    maxWidth: '8rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
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
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

const CustomerNavLink: React.FC<{ to: string; active?: boolean; children: React.ReactNode }> = ({
  to,
  active = false,
  children,
}) => (
  <Link
    to={to}
    className="text-sm px-3 py-2 rounded-lg transition-all"
    style={{
      color: active ? '#f3f4f6' : '#9ca3af',
      backgroundColor: active ? '#111827' : 'transparent',
      textDecoration: 'none',
    }}
  >
    {children}
  </Link>
);

const AdminNavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link
    to={to}
    className="text-sm px-3 py-1.5 rounded-lg transition-all"
    style={{ color: '#6b7280', textDecoration: 'none' }}
  >
    {children}
  </Link>
);
