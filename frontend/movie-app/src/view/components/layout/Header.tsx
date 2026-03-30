import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../viewmodel/hooks/useAuth';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-red-500 tracking-wide">🎬 CinePlex</Link>

        <nav className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              {user?.role === 'CUSTOMER' && (
                <>
                  <Link to="/movies" className="text-gray-300 hover:text-white text-sm">Movies</Link>
                  <Link to="/bookings" className="text-gray-300 hover:text-white text-sm">My Bookings</Link>
                  <Link to="/profile" className="text-gray-300 hover:text-white text-sm">Profile</Link>
                </>
              )}
              {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                <Link to="/admin" className="text-gray-300 hover:text-white text-sm">Dashboard</Link>
              )}
              <span className="text-gray-500 text-sm">{user?.fullName}</span>
              <button onClick={handleLogout}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-300 hover:text-white text-sm">Login</Link>
              <Link to="/register"
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};