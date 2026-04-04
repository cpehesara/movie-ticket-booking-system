package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.exception.InvalidSeatStateTransitionException;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.service.interfaces.SeatStateHandler;

/**
 * STATE PATTERN — Six concrete state classes.
 *
 * All are package-private: they are implementation details of the service
 * layer. Only SeatStateContext.of(SeatState) instantiates them. No external
 * class ever references AvailableState, BookedState, etc. by name.
 *
 * Each class encodes exactly which transitions are legal from its own state
 * and throws InvalidSeatStateTransitionException on illegal ones — removing
 * all transition-guard if-else logic from SeatServiceImpl.
 */

// ══════════════════════════════════════════════════════════════════════════
//  AVAILABLE — open, no booking against it
//  Exits: → RESERVED, → MAINTENANCE
// ══════════════════════════════════════════════════════════════════════════
class AvailableState implements SeatStateHandler {

    @Override public SeatState reserve(SeatStateContext ctx) {
        ctx.transitionTo(new ReservedState());
        return SeatState.RESERVED;
    }

    @Override public SeatState book(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException(
                "Seat must be RESERVED before it can be BOOKED.");
    }

    @Override public SeatState occupy(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException(
                "Cannot occupy an AVAILABLE seat — booking required first.");
    }

    @Override public SeatState cancel(SeatStateContext ctx) {
        return SeatState.AVAILABLE;        // idempotent
    }

    @Override public SeatState release(SeatStateContext ctx) {
        return SeatState.AVAILABLE;        // already available
    }

    @Override public SeatState putInMaintenance(SeatStateContext ctx) {
        ctx.transitionTo(new MaintenanceState());
        return SeatState.MAINTENANCE;
    }

    @Override public SeatState getState() { return SeatState.AVAILABLE; }
}

// ══════════════════════════════════════════════════════════════════════════
//  RESERVED — payment window open (7-min TTL)
//  Exits: → BOOKED, → CANCELLED, → AVAILABLE (expiry), → MAINTENANCE
// ══════════════════════════════════════════════════════════════════════════
class ReservedState implements SeatStateHandler {

    @Override public SeatState reserve(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException(
                "Seat is already RESERVED by another customer.");
    }

    @Override public SeatState book(SeatStateContext ctx) {
        ctx.transitionTo(new BookedState());
        return SeatState.BOOKED;
    }

    @Override public SeatState occupy(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException(
                "Cannot check-in a RESERVED seat — payment must be completed first.");
    }

    @Override public SeatState cancel(SeatStateContext ctx) {
        ctx.transitionTo(new CancelledState());
        return SeatState.CANCELLED;
    }

    @Override public SeatState release(SeatStateContext ctx) {
        ctx.transitionTo(new AvailableState());   // reservation timed out
        return SeatState.AVAILABLE;
    }

    @Override public SeatState putInMaintenance(SeatStateContext ctx) {
        ctx.transitionTo(new MaintenanceState());
        return SeatState.MAINTENANCE;
    }

    @Override public SeatState getState() { return SeatState.RESERVED; }
}

// ══════════════════════════════════════════════════════════════════════════
//  BOOKED — payment confirmed, QR ticket issued; LED = BLUE
//  Exits: → GUIDING (door scan), → OCCUPIED, → CANCELLED, → MAINTENANCE
// ══════════════════════════════════════════════════════════════════════════
class BookedState implements SeatStateHandler {

    @Override public SeatState reserve(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException("Seat is already BOOKED.");
    }

    @Override public SeatState book(SeatStateContext ctx) {
        return SeatState.BOOKED;   // idempotent re-confirmation
    }

    @Override public SeatState occupy(SeatStateContext ctx) {
        ctx.transitionTo(new OccupiedState());
        return SeatState.OCCUPIED;
    }

    @Override public SeatState cancel(SeatStateContext ctx) {
        ctx.transitionTo(new CancelledState());
        return SeatState.CANCELLED;
    }

    @Override public SeatState release(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException(
                "Cannot directly release a BOOKED seat — cancel the booking first.");
    }

    @Override public SeatState putInMaintenance(SeatStateContext ctx) {
        ctx.transitionTo(new MaintenanceState());
        return SeatState.MAINTENANCE;
    }

    /** Step 1 door scan: BOOKED → GUIDING (LED blinks white to guide customer). */
    @Override public SeatState guide(SeatStateContext ctx) {
        ctx.transitionTo(new GuidingState());
        return SeatState.GUIDING;
    }

    @Override public SeatState getState() { return SeatState.BOOKED; }
}

// ══════════════════════════════════════════════════════════════════════════
//  GUIDING — customer scanned door QR, LED blinks white to lead them to seat
//  Exits: → OCCUPIED (seat scan), → CANCELLED, → MAINTENANCE
// ══════════════════════════════════════════════════════════════════════════
class GuidingState implements SeatStateHandler {

    @Override public SeatState reserve(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException("Seat is currently GUIDING a customer.");
    }

    @Override public SeatState book(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException("Seat is already in GUIDING state.");
    }

    @Override public SeatState occupy(SeatStateContext ctx) {
        ctx.transitionTo(new OccupiedState());
        return SeatState.OCCUPIED;
    }

    @Override public SeatState cancel(SeatStateContext ctx) {
        ctx.transitionTo(new CancelledState());
        return SeatState.CANCELLED;
    }

    @Override public SeatState release(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException(
                "Cannot release a GUIDING seat — customer is in transit.");
    }

    @Override public SeatState putInMaintenance(SeatStateContext ctx) {
        ctx.transitionTo(new MaintenanceState());
        return SeatState.MAINTENANCE;
    }

    /** Idempotent — double door scan is harmless. */
    @Override public SeatState guide(SeatStateContext ctx) {
        return SeatState.GUIDING;
    }

    @Override public SeatState getState() { return SeatState.GUIDING; }
}

// ══════════════════════════════════════════════════════════════════════════
//  OCCUPIED — customer physically seated; LED = RED
//  Exits: → AVAILABLE (after show ends), → MAINTENANCE
// ══════════════════════════════════════════════════════════════════════════
class OccupiedState implements SeatStateHandler {

    @Override public SeatState reserve(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException("Seat is currently OCCUPIED.");
    }

    @Override public SeatState book(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException("Seat is currently OCCUPIED.");
    }

    @Override public SeatState occupy(SeatStateContext ctx) {
        return SeatState.OCCUPIED;   // duplicate kiosk scan — idempotent
    }

    @Override public SeatState cancel(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException(
                "Cannot cancel an OCCUPIED seat — the customer is already seated.");
    }

    @Override public SeatState release(SeatStateContext ctx) {
        ctx.transitionTo(new AvailableState());
        return SeatState.AVAILABLE;
    }

    @Override public SeatState putInMaintenance(SeatStateContext ctx) {
        ctx.transitionTo(new MaintenanceState());
        return SeatState.MAINTENANCE;
    }

    @Override public SeatState getState() { return SeatState.OCCUPIED; }
}

// ══════════════════════════════════════════════════════════════════════════
//  CANCELLED — booking was cancelled or reservation expired
//  Exits: → AVAILABLE (admin recycles), → MAINTENANCE
// ══════════════════════════════════════════════════════════════════════════
class CancelledState implements SeatStateHandler {

    @Override public SeatState reserve(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException(
                "Cannot reserve a CANCELLED seat — an admin must release it first.");
    }

    @Override public SeatState book(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException("Seat is CANCELLED.");
    }

    @Override public SeatState occupy(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException("Seat is CANCELLED.");
    }

    @Override public SeatState cancel(SeatStateContext ctx) {
        return SeatState.CANCELLED;   // idempotent
    }

    @Override public SeatState release(SeatStateContext ctx) {
        ctx.transitionTo(new AvailableState());
        return SeatState.AVAILABLE;
    }

    @Override public SeatState putInMaintenance(SeatStateContext ctx) {
        ctx.transitionTo(new MaintenanceState());
        return SeatState.MAINTENANCE;
    }

    @Override public SeatState getState() { return SeatState.CANCELLED; }
}

// ══════════════════════════════════════════════════════════════════════════
//  MAINTENANCE — admin-blocked; LED = WHITE (dim)
//  Exit: → AVAILABLE only (admin clears)
// ══════════════════════════════════════════════════════════════════════════
class MaintenanceState implements SeatStateHandler {

    @Override public SeatState reserve(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException(
                "Seat is under MAINTENANCE and cannot be reserved.");
    }

    @Override public SeatState book(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException("Seat is under MAINTENANCE.");
    }

    @Override public SeatState occupy(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException("Seat is under MAINTENANCE.");
    }

    @Override public SeatState cancel(SeatStateContext ctx) {
        throw new InvalidSeatStateTransitionException("Seat is under MAINTENANCE.");
    }

    @Override public SeatState release(SeatStateContext ctx) {
        ctx.transitionTo(new AvailableState());
        return SeatState.AVAILABLE;
    }

    @Override public SeatState putInMaintenance(SeatStateContext ctx) {
        return SeatState.MAINTENANCE;   // idempotent
    }

    @Override public SeatState getState() { return SeatState.MAINTENANCE; }
}