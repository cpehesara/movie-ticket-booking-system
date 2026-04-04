package com.cinema.seatmanagement.model.enums;

/**
 * SeatState — the canonical state machine for a seat within a given showtime.
 *
 * State transitions (valid paths):
 *
 *   AVAILABLE → RESERVED   (customer selects seat)
 *   RESERVED  → BOOKED     (payment confirmed)
 *   RESERVED  → CANCELLED  (timeout or manual cancel)
 *   BOOKED    → GUIDING    (Step 1: customer scans QR at entrance door — LED blinks fast)
 *   BOOKED    → CANCELLED  (admin or customer cancels)
 *   GUIDING   → OCCUPIED   (Step 2: customer scans permanent seat QR — LED turns OFF)
 *   OCCUPIED  → AVAILABLE  (show ends, seat released for next showtime)
 *   CANCELLED → AVAILABLE  (seat released back into the pool)
 *   Any       → MAINTENANCE (admin override; LED dim blink)
 *   MAINTENANCE → AVAILABLE (admin clears maintenance)
 *
 * GUIDING is the "in-transit" state between the entrance door scan and the
 * physical seat scan. While a seat is GUIDING, its dedicated LED blinks fast
 * so the customer can visually locate their seat in the dark cinema hall.
 * This is the core value proposition of the IoT layer — no door staff needed.
 *
 * GoF State pattern: SeatServiceImpl.validateStateTransition() enforces these
 * transitions, and each invalid attempt throws InvalidSeatStateTransitionException.
 */
public enum SeatState {

    /** Seat is open for selection by any customer. LED = OFF */
    AVAILABLE,

    /** Customer clicked the seat; payment window is open (7-minute TTL). LED = BLINK_SLOW */
    RESERVED,

    /** Payment confirmed; ticket issued; customer is not yet in the building. LED = SOLID_ON */
    BOOKED,

    /**
     * Customer scanned QR at the entrance door (Step 1 of two-scan flow).
     * The LED for this seat is now BLINKING FAST to guide the customer to their seat.
     * This state is intentionally short-lived — a few minutes at most.
     * LED = BLINK_FAST
     */
    GUIDING,

    /** Customer confirmed at physical seat (Step 2 of two-scan flow). LED = OFF */
    OCCUPIED,

    /** Booking was cancelled or reservation expired. Seat is functionally AVAILABLE again. LED = OFF */
    CANCELLED,

    /** Seat disabled by admin (broken armrest, blocked view, etc.). LED = BLINK_VERY_SLOW */
    MAINTENANCE
}