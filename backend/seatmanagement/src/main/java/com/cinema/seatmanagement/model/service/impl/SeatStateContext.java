package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.service.interfaces.SeatStateHandler;
import lombok.extern.slf4j.Slf4j;

/**
 * STATE PATTERN — Context class.
 *
 * Holds the current SeatStateHandler and routes every transition call to it.
 * Callers (SeatServiceImpl, BookingServiceImpl, CheckinServiceImpl,
 * PaymentServiceImpl) never touch concrete state classes — they only call
 * context methods.
 *
 * Usage:
 *   SeatStateContext ctx = SeatStateContext.of(bookingSeat.getSeatState());
 *   SeatState next = ctx.book();   // RESERVED → BOOKED, or throws
 *   bookingSeat.setSeatState(next);
 *
 * Not a Spring bean — created per transition, used once, then discarded.
 * State handler objects are stateless so they can be instantiated freely.
 */
@Slf4j
public final class SeatStateContext {

    private SeatStateHandler current;

    private SeatStateContext(SeatStateHandler handler) {
        this.current = handler;
    }

    /**
     * Factory method: create a context loaded with the handler matching the
     * seat's current state as read from the database.
     */
    public static SeatStateContext of(SeatState currentState) {
        SeatStateHandler handler = switch (currentState) {
            case AVAILABLE   -> new AvailableState();
            case RESERVED    -> new ReservedState();
            case BOOKED      -> new BookedState();
            case OCCUPIED    -> new OccupiedState();
            case CANCELLED   -> new CancelledState();
            case MAINTENANCE -> new MaintenanceState();
        };
        return new SeatStateContext(handler);
    }

    // ── Public API — one method per possible transition ───────────────────

    public SeatState reserve()          { return current.reserve(this); }
    public SeatState book()             { return current.book(this); }
    public SeatState occupy()           { return current.occupy(this); }
    public SeatState cancel()           { return current.cancel(this); }
    public SeatState release()          { return current.release(this); }
    public SeatState putInMaintenance() { return current.putInMaintenance(this); }
    public SeatState getCurrent()       { return current.getState(); }

    /** Called by state objects to switch to the next state. */
    void transitionTo(SeatStateHandler next) {
        log.debug("[SeatState] {} → {}", current.getState(), next.getState());
        this.current = next;
    }
}