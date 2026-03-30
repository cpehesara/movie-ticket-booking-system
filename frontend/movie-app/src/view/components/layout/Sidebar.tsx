import React from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/admin', label: '📊 Dashboard', end: true },
  { to: '/admin/movies', label: '🎬 Movies' },
  { to: '/admin/showtimes', label: '🕐 Showtimes' },
  { to: '/admin/bookings', label: '🎟 Bookings' },
  { to: '/admin/staff', label: '👥 Staff' },
  { to: '/admin/kiosks', label: '🖥 Kiosks' },
];

export const Sidebar: React.FC = () => (
  <aside className="w-56 shrink-0 bg-gray-900 border-r border-gray-800 min-h-screen">
    <nav className="py-6 flex flex-col gap-1 px-3">
      {links.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-red-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  </aside>
);