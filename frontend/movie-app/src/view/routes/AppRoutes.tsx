import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleBasedRoute } from './RoleBasedRoute';

// Auth
import { LoginPage }    from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';

// Customer
import { MovieListPage }      from '../pages/customer/MovieListPage';
import { BookingPage }        from '../pages/customer/BookingPage';
import { BookingHistoryPage } from '../pages/customer/BookingHistoryPage';
import { ProfilePage }        from '../pages/customer/ProfilePage';

// Kiosk — no JWT required; X-API-Key header sent by the kiosk device
import { CheckinPage }     from '../pages/kiosk/CheckinPage';
import { SeatArrivalPage } from '../pages/kiosk/SeatArrivalPage';

// Admin / Manager
import { AdminDashboard }        from '../pages/admin/AdminDashboard';
import { MovieManagementPage }   from '../pages/admin/MovieManagementPage';
import { ShowtimeManagementPage} from '../pages/admin/ShowtimeManagementPage';
import { StaffManagementPage }   from '../pages/admin/StaffManagementPage';
import { KioskManagementPage }   from '../pages/admin/KioskManagementPage';
import { LiveTrackingPage }      from '../pages/admin/LiveTrackingPage';

// Display — public read-only (shown on hall TV screens)
import { HallDisplayPage } from '../pages/display/HallDisplayPage';

export const AppRoutes: React.FC = () => (
  <Routes>
    {/* ── Public ──────────────────────────────────────────────────────── */}
    <Route path="/"        element={<Navigate to="/movies" replace />} />
    <Route path="/login"   element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/movies"  element={<MovieListPage />} />

    {/* Hall display board — public, shown on cinema lobby TV */}
    <Route path="/display/:showtimeId" element={<HallDisplayPage />} />

    {/* ── Kiosk ───────────────────────────────────────────────────────── */}
    {/* Step 1: customer scans booking QR at entrance door                */}
    <Route path="/kiosk/checkin"      element={<CheckinPage />} />
    {/* Step 2: customer scans permanent seat QR at their physical seat   */}
    <Route path="/kiosk/seat-arrival" element={<SeatArrivalPage />} />

    {/* ── Customer (JWT required) ──────────────────────────────────────── */}
    <Route path="/booking/:showtimeId" element={
      <ProtectedRoute><BookingPage /></ProtectedRoute>
    } />
    <Route path="/bookings" element={
      <ProtectedRoute><BookingHistoryPage /></ProtectedRoute>
    } />
    <Route path="/profile" element={
      <ProtectedRoute><ProfilePage /></ProtectedRoute>
    } />

    {/* ── Admin / Manager ──────────────────────────────────────────────── */}
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

    {/*
      Live tracking — staff view of customer seating progress in real-time.
      URL: /admin/tracking/{showtimeId}
      Displays which customers have scanned at the door vs confirmed at their seat.
      The blinking LED indicator on screen mirrors the physical ESP32 LED state.
    */}
    <Route path="/admin/tracking/:showtimeId" element={
      <RoleBasedRoute allowedRoles={['ADMIN', 'MANAGER', 'OPERATOR']}>
        <LiveTrackingPage />
      </RoleBasedRoute>
    } />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);