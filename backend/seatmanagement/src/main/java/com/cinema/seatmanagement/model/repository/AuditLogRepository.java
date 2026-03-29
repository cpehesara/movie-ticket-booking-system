package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.AuditLog;
import com.cinema.seatmanagement.model.enums.AuditAction;
import com.cinema.seatmanagement.model.enums.SeatState;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /** Full history for one seat across all showtimes — admin forensics view */
    List<AuditLog> findBySeatIdOrderByCreatedAtDesc(Long seatId);

    /** All events for a showtime — ordered ascending so you can replay them */
    List<AuditLog> findByShowtimeIdOrderByCreatedAtAsc(Long showtimeId);

    /** All events for a booking — check-in timeline on customer receipt */
    List<AuditLog> findByBookingIdOrderByCreatedAtAsc(Long bookingId);

    /**
     * Last N state-change events for a showtime.
     * Used by ESP32 re-sync: after reconnect the backend replays the latest
     * state of every seat so LEDs match the DB without a full reset.
     */
    @Query("""
        SELECT a FROM AuditLog a
        WHERE a.showtime.id = :showtimeId
          AND a.action IN ('SEAT_RESERVED','SEAT_BOOKED','SEAT_OCCUPIED',
                           'SEAT_CANCELLED','SEAT_MAINTENANCE_SET',
                           'SEAT_MAINTENANCE_CLEARED','SEAT_RELEASED_BY_EXPIRY')
        ORDER BY a.createdAt DESC
        """)
    List<AuditLog> findSeatStateEventsForShowtime(@Param("showtimeId") Long showtimeId);

    /** Paginated admin log — dashboard "recent activity" table */
    Page<AuditLog> findByShowtimeIdOrderByCreatedAtDesc(Long showtimeId, Pageable pageable);

    /** Time-range query for reporting (e.g. "how many RESERVED→CANCELLED last month?") */
    @Query("""
        SELECT a FROM AuditLog a
        WHERE a.action = :action
          AND a.createdAt BETWEEN :from AND :to
        ORDER BY a.createdAt DESC
        """)
    List<AuditLog> findByActionBetween(
            @Param("action") AuditAction action,
            @Param("from")   LocalDateTime from,
            @Param("to")     LocalDateTime to
    );

    /** Transitions from a specific fromState in a time window — analytics */
    @Query("""
        SELECT a FROM AuditLog a
        WHERE a.fromState = :fromState
          AND a.toState   = :toState
          AND a.createdAt BETWEEN :from AND :to
        """)
    List<AuditLog> findTransitions(
            @Param("fromState") SeatState fromState,
            @Param("toState")   SeatState toState,
            @Param("from")      LocalDateTime from,
            @Param("to")        LocalDateTime to
    );

    /** Count of a given action — lightweight dashboard KPI */
    long countByActionAndCreatedAtBetween(AuditAction action, LocalDateTime from, LocalDateTime to);

    /** All entries triggered by a specific actor (user ID or kiosk ID) */
    @Query("""
        SELECT a FROM AuditLog a
        WHERE a.actorId   = :actorId
          AND a.actorType = :actorType
        ORDER BY a.createdAt DESC
        """)
    List<AuditLog> findByActor(
            @Param("actorId")   Long actorId,
            @Param("actorType") String actorType
    );
}