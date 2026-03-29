package com.cinema.seatmanagement.model.enums;

/**
 * Typed vocabulary for AuditLog.action.
 *
 * Using an enum (stored as VARCHAR in the DB) means:
 *  - Illegal action strings are impossible at the Java layer
 *  - IDE auto-complete works across the entire codebase
 *  - Adding a new action is a one-line change here + the migration adds
 *    no schema change (VARCHAR column accepts any value up to 40 chars)
 */
public enum AuditAction {

    // ── Seat transitions ────────────────────────────────────────────
    SEAT_RESERVED,              // AVAILABLE  → RESERVED  (customer selects seat)
    SEAT_BOOKED,                // RESERVED   → BOOKED    (payment confirmed)
    SEAT_OCCUPIED,              // BOOKED     → OCCUPIED  (kiosk check-in)
    SEAT_CANCELLED,             // RESERVED/BOOKED → CANCELLED (cancel or expired)
    SEAT_RELEASED_BY_EXPIRY,    // RESERVED   → CANCELLED (TTL scheduler)
    SEAT_RELEASED_POST_SHOW,    // OCCUPIED   → AVAILABLE (show ended)
    SEAT_MAINTENANCE_SET,       // any        → MAINTENANCE (admin override)
    SEAT_MAINTENANCE_CLEARED,   // MAINTENANCE→ AVAILABLE  (admin clears)

    // ── Booking lifecycle ────────────────────────────────────────────
    BOOKING_CREATED,            // Booking row inserted, seats RESERVED
    BOOKING_CONFIRMED,          // Payment success → BookingStatus.CONFIRMED
    BOOKING_CANCELLED,          // Customer or admin explicit cancel
    BOOKING_EXPIRED,            // TTL scheduler marks PENDING → EXPIRED

    // ── Check-in ────────────────────────────────────────────────────
    CHECKIN_COMPLETED,          // Kiosk scanned QR → seats OCCUPIED

    // ── Showtime events ─────────────────────────────────────────────
    SHOWTIME_STARTED,           // Scheduler advances SCHEDULED → IN_PROGRESS
    SHOWTIME_COMPLETED,         // Scheduler advances IN_PROGRESS → COMPLETED
    SHOWTIME_CANCELLED,         // Admin cancels showtime

    // ── Admin overrides ─────────────────────────────────────────────
    ADMIN_STATE_OVERRIDE        // Any forced state change outside normal flow
}