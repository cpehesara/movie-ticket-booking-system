package com.cinema.seatmanagement.model.enums;

/**
 * Seat state machine — governs LED color and booking eligibility.
 *
 * Valid transitions (enforced in SeatServiceImpl.validateStateTransition):
 *
 *   AVAILABLE  → RESERVED    (customer selects seat)
 *   AVAILABLE  → MAINTENANCE (admin override)
 *   RESERVED   → BOOKED      (payment confirmed)
 *   RESERVED   → CANCELLED   (TTL expired or customer backs out)
 *   RESERVED   → MAINTENANCE (admin override)
 *   BOOKED     → OCCUPIED    (kiosk check-in scan)
 *   BOOKED     → CANCELLED   (customer/admin cancels after payment)
 *   BOOKED     → MAINTENANCE (admin override)
 *   OCCUPIED   → AVAILABLE   (show ends, automated cleanup)
 *   OCCUPIED   → MAINTENANCE (admin override)
 *   CANCELLED  → AVAILABLE   (re-opened for new booking)
 *   CANCELLED  → MAINTENANCE (admin override)
 *   MAINTENANCE→ AVAILABLE   (admin clears maintenance flag)
 */
public enum SeatState {
    AVAILABLE,
    RESERVED,
    BOOKED,
    OCCUPIED,
    CANCELLED,
    MAINTENANCE
}