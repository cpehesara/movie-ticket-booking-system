import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleBasedRoute } from './RoleBasedRoute';

// Auth
import { LoginPage }    from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';

// Customer
import { HomePage }           from '../pages/customer/HomePage';
import { ExperiencePage }     from '../pages/customer/ExperiencePage';
import { MovieListPage }      from '../pages/customer/MovieListPage';
import { BookingPage }        from '../pages/customer/BookingPage';
import { BookingHistoryPage } from '../pages/customer/BookingHistoryPage';
import { ProfilePage }        from '../pages/customer/ProfilePage';

// Kiosk  (X-API-Key auth handled at backend — no JWT required on frontend)
import { CheckinPage }     from '../pages/kiosk/CheckinPage';
import { SeatArrivalPage } from '../pages/kiosk/SeatArrivalPage';

// Admin
import { AdminDashboard }         from '../pages/admin/AdminDashboard';
import { IoTMonitorPage }         from '../pages/admin/IoTMonitorPage';
import { MovieManagementPage }    from '../pages/admin/MovieManagementPage';
import { ShowtimeManagementPage } from '../pages/admin/ShowtimeManagementPage';
import { StaffManagementPage }    from '../pages/admin/StaffManagementPage';
import { KioskManagementPage }    from '../pages/admin/KioskManagementPage';
import { SeatQrManagementPage }   from '../pages/admin/SeatQrManagementPage';
import { UserManualPage }         from '../pages/admin/UserManualPage';

// Display board (mounted on a large screen outside each hall — public route)
import { HallDisplayPage } from '../pages/display/HallDisplayPage';

export const AppRoutes: React.FC = () => (
  <Routes>
    {/* ── Public ──────────────────────────────────────────────────── */}
    <Route path="/"         element={<HomePage />} />
    <Route path="/experience" element={<ExperiencePage />} />
    <Route path="/login"    element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/movies"   element={<MovieListPage />} />

    {/*
      Hall display board — intentionally public so a Raspberry Pi or
      browser kiosk can load it without authentication.
    */}
    <Route path="/display/:showtimeId" element={<HallDisplayPage />} />

    {/* ── Kiosk ── (public route; backend validates via X-API-Key) ── */}
    <Route path="/kiosk/checkin"       element={<CheckinPage />} />
    <Route path="/kiosk/seat-arrival"  element={<SeatArrivalPage />} />

    {/* ── Customer (JWT required) ──────────────────────────────────── */}
    <Route path="/booking/:showtimeId" element={
      <ProtectedRoute><BookingPage /></ProtectedRoute>
    } />
    <Route path="/bookings" element={
      <ProtectedRoute><BookingHistoryPage /></ProtectedRoute>
    } />
    <Route path="/profile" element={
      <ProtectedRoute><ProfilePage /></ProtectedRoute>
    } />

    {/* ── Admin / Manager ──────────────────────────────────────────── */}
    <Route path="/admin" element={
      <RoleBasedRoute allowedRoles={['ADMIN', 'MANAGER']}>
        <AdminDashboard />
      </RoleBasedRoute>
    } />

    {/*
      IoT Monitor — the primary staff visualisation of the physical LED strip.
      Shows real-time seat states as LED indicators, in-transit amber pulses,
      live IoT event feed, and ESP32 device health.
    */}
    <Route path="/admin/iot-monitor" element={
      <RoleBasedRoute allowedRoles={['ADMIN', 'MANAGER', 'OPERATOR']}>
        <IoTMonitorPage />
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
    <Route path="/admin/seat-qr-codes" element={
      <RoleBasedRoute allowedRoles={['ADMIN', 'MANAGER']}>
        <SeatQrManagementPage />
      </RoleBasedRoute>
    } />
    <Route path="/admin/manual" element={
      <RoleBasedRoute allowedRoles={['ADMIN', 'MANAGER', 'OPERATOR']}>
        <UserManualPage />
      </RoleBasedRoute>
    } />

    {/* ── Fallback ─────────────────────────────────────────────────── */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
