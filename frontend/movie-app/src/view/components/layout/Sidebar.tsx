import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../viewmodel/store';

const links = [
  { to: '/admin',                label: 'Dashboard',        icon: '▤',  end: true  },
  { to: '/admin/movies',         label: 'Movies',           icon: '▶'              },
  { to: '/admin/showtimes',      label: 'Showtimes',        icon: '◷'              },
  { to: '/admin/bookings',       label: 'Bookings',         icon: '◈'              },
  { to: '/admin/iot-monitor',    label: 'IoT Monitor',      icon: '◉',  iot: true  },
  { to: '/admin/seat-qr-codes',  label: 'QR Stickers',      icon: '▣'              },
  { to: '/admin/staff',          label: 'Staff',            icon: '◎'              },
  { to: '/admin/kiosks',         label: 'Kiosks',           icon: '⬜'             },
  { to: '/admin/manual',         label: 'User Manual',      icon: '◇'              },
];

export const Sidebar: React.FC = () => {
  const esp32Online = useSelector((s: RootState) => s.iot.esp32.online);
  const inTransitCount = useSelector((s: RootState) => s.iot.inTransitSeatIds.length);

  return (
    <aside className="w-56 shrink-0 flex flex-col" style={{ backgroundColor: '#0f1117', borderRight: '1px solid #1f2937', minHeight: '100vh' }}>
      {/* Brand */}
      <div className="px-5 py-5 border-b" style={{ borderColor: '#1f2937' }}>
        <p className="font-black tracking-widest uppercase" style={{ color: '#dc2626', fontSize: '0.7rem', letterSpacing: '0.2em' }}>
          CinePlex
        </p>
        <p style={{ color: '#374151', fontSize: '0.6rem', marginTop: '2px' }}>Admin Console</p>
      </div>

      <nav className="py-4 flex flex-col gap-0.5 px-3 flex-1">
        {links.map(({ to, label, icon, end, iot }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800/50'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { backgroundColor: 'rgba(220,38,38,0.15)', color: '#f87171' }
                : {}
            }
          >
            <span
              className="flex-shrink-0 font-mono"
              style={{ fontSize: '0.85rem', width: '1.1rem', textAlign: 'center' }}
            >
              {icon}
            </span>
            <span className="flex-1">{label}</span>

            {/* IoT status badge */}
            {iot && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5"
                style={{
                  fontSize: '0.6rem',
                  backgroundColor: esp32Online ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  color: esp32Online ? '#4ade80' : '#f87171',
                }}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: esp32Online ? '#4ade80' : '#f87171',
                    boxShadow: esp32Online ? '0 0 4px #4ade80' : 'none',
                  }}
                />
                {esp32Online ? 'live' : 'off'}
              </span>
            )}

            {/* In-transit badge on IoT Monitor */}
            {iot && inTransitCount > 0 && (
              <span
                className="rounded-full font-bold"
                style={{
                  fontSize: '0.55rem',
                  backgroundColor: '#f97316',
                  color: '#fff',
                  padding: '1px 5px',
                  boxShadow: '0 0 6px rgba(249,115,22,0.6)',
                }}
              >
                {inTransitCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer version */}
      <div className="px-5 py-4 border-t" style={{ borderColor: '#1f2937' }}>
        <p style={{ color: '#1f2937', fontSize: '0.6rem' }}>v1.0 · IT 3052</p>
      </div>
    </aside>
  );
};