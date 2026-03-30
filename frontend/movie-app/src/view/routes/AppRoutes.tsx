import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleBasedRoute } from './RoleBasedRoute';

// Auth
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';

// Customer
import { MovieListPage } from '../pages/customer/MovieListPage';
import { BookingPage } from '../pages/customer/BookingPage';
import { BookingHistoryPage } from '../pages/customer/BookingHistoryPage';
import { ProfilePage } from '../pages/customer/ProfilePage';

// Kiosk
import { CheckinPage } from '../pages/kiosk/CheckinPage';
import { SeatArrivalPage } from '../pages/kiosk/SeatArrivalPage';

// Admin
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { MovieManagementPage } from '../pages/admin/MovieManagementPage';
import { ShowtimeManagementPage } from '../pages/admin/ShowtimeManagementPage';
import { StaffManagementPage } from '../pages/admin/StaffManagementPage';
import { KioskManagementPage } from '../pages/admin/KioskManagementPage';

// Display
import { HallDisplayPage } from '../pages/display/HallDisplayPage';

export const AppRoutes: React.FC = () => (
  <Routes>
    {/* Public */}
    <Route path="/" element={<Navigate to="/movies" replace />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/movies" element={<MovieListPage />} />
    <Route path="/display/:showtimeId" element={<HallDisplayPage />} />

    {/* Kiosk — public (X-API-Key auth at backend) */}
    <Route path="/kiosk/checkin" element={<CheckinPage />} />
    <Route path="/kiosk/seat-arrival" element={<SeatArrivalPage />} />

    {/* Customer */}
    <Route path="/booking/:showtimeId" element={
      <ProtectedRoute><BookingPage /></ProtectedRoute>
    } />
    <Route path="/bookings" element={
      <ProtectedRoute><BookingHistoryPage /></ProtectedRoute>
    } />
    <Route path="/profile" element={
      <ProtectedRoute><ProfilePage /></ProtectedRoute>
    } />

    {/* Admin / Manager */}
    <Route path="/admin" element={
      <RoleBasedRoute allowedRoles={['ADMIN', 'MANAGER']}>
        <AdminDashboard />
      </RoleBasedRoute>
    } />
    <Route path="/admin/movies" element={
      <RoleBasedRoute allowedRoles={['ADMIN', 'MANAGER']}>
        <MovieManagementPage />
      </RoleBasedRoute>
    } />
    <Route path="/admin/showtimes" element={
      <RoleBasedRoute allowedRoles={['ADMIN', 'MANAGER']}>
        <ShowtimeManagementPage />
      </RoleBasedRoute>
    } />
    <Route path="/admin/bookings" element={
      <RoleBasedRoute allowedRoles={['ADMIN', 'MANAGER']}>
        <AdminDashboard />
      </RoleBasedRoute>
    } />
    <Route path="/admin/staff" element={
      <RoleBasedRoute allowedRoles={['ADMIN']}>
        <StaffManagementPage />
      </RoleBasedRoute>
    } />
    <Route path="/admin/kiosks" element={
      <RoleBasedRoute allowedRoles={['ADMIN']}>
        <KioskManagementPage />
      </RoleBasedRoute>
    } />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);