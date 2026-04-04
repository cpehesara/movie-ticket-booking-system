package com.cinema.seatmanagement.model.service.interfaces;

import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.service.impl.SeatStateContext;

/**
 * STATE PATTERN — Handler interface.
 *
 * Each concrete state class implements this interface and decides which
 * transitions are legal from itself. SeatStateContext holds the current
 * handler and delegates every call to it.
 *
 * Adding a new state = add one enum value + one implementing class.
 * Zero changes to SeatServiceImpl, BookingServiceImpl, or CheckinServiceImpl.
 * This satisfies the Open/Closed principle.
 */
public interface SeatStateHandler {

    /** Customer selects this seat during booking. */
    SeatState reserve(SeatStateContext ctx);

    /** Payment confirmed — seat is secured. */
    SeatState book(SeatStateContext ctx);

    /** Customer scanned QR at kiosk — physically seated. */
    SeatState occupy(SeatStateContext ctx);

    /** Booking cancelled by customer or admin. */
    SeatState cancel(SeatStateContext ctx);

    /** Seat returned to pool — TTL expiry or post-show cleanup. */
    SeatState release(SeatStateContext ctx);

    /** Admin blocks this seat (broken, obstructed). */
    SeatState putInMaintenance(SeatStateContext ctx);

    /**
     * Customer scanned QR at entrance door (Step 1 of two-scan flow).
     * Transitions BOOKED → GUIDING so the LED blinks to guide the customer.
     * Default throws; only BookedState and GuidingState (idempotent) override.
     */
    default SeatState guide(SeatStateContext ctx) {
        throw new com.cinema.seatmanagement.exception.InvalidSeatStateTransitionException(
                "Cannot transition to GUIDING from state: " + getState());
    }

    /** Returns the SeatState enum value this handler represents. */
    SeatState getState();
}