package com.cinema.seatmanagement.model.service.interfaces;

import com.cinema.seatmanagement.model.entity.AuditLog;
import com.cinema.seatmanagement.model.enums.AuditAction;
import com.cinema.seatmanagement.model.enums.SeatState;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditLogService {

    /**
     * Record a seat state transition.
     * Called by SeatServiceImpl after every successful state change.
     *
     * @param seatId      DB id of the seat (may be null for non-seat actions)
     * @param showtimeId  DB id of the showtime context
     * @param bookingId   DB id of the booking that triggered the change (null for admin/system)
     * @param actorId     ID of the user or kiosk performing the action (null for system)
     * @param actorType   "USER" | "KIOSK" | "SYSTEM"
     * @param action      The typed action enum value
     * @param fromState   Previous seat state (null if not applicable)
     * @param toState     New seat state (null if not applicable)
     * @param notes       Optional freeform context
     */
    void record(
            Long seatId,
            Long showtimeId,
            Long bookingId,
            Long actorId,
            String actorType,
            AuditAction action,
            SeatState fromState,
            SeatState toState,
            String notes
    );

    List<AuditLog> getHistoryForSeat(Long seatId);

    List<AuditLog> getHistoryForShowtime(Long showtimeId);

    List<AuditLog> getHistoryForBooking(Long bookingId);

    Page<AuditLog> getPagedHistoryForShowtime(Long showtimeId, Pageable pageable);

    /**
     * Returns the ordered list of seat-state events for a showtime.
     * Called by the MQTT re-sync endpoint when an ESP32 reconnects —
     * the backend iterates over current BookingSeat states and replays
     * SET_LED commands for every seat.
     */
    List<AuditLog> getSeatStateEventsForShowtime(Long showtimeId);

    long countAction(AuditAction action, LocalDateTime from, LocalDateTime to);
}