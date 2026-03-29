package com.cinema.seatmanagement.model.entity;

import com.cinema.seatmanagement.model.enums.AuditAction;
import com.cinema.seatmanagement.model.enums.SeatState;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Immutable audit trail for every seat state transition.
 *
 * Why this matters at real-cinema scale:
 *  - Dispute resolution ("customer claims seat was available when they booked")
 *  - Analytics ("how many RESERVED→CANCELLED in last month?")
 *  - ESP32 re-sync ("replay last N events to rebuild LED state after reconnect")
 *  - Admin forensics ("who forced this seat to MAINTENANCE and when?")
 *
 * Write-once: no setters beyond what Lombok generates; never UPDATE this table.
 */
@Entity
@Table(
        name = "audit_log",
        indexes = {
                @Index(name = "idx_audit_log_seat_id",      columnList = "seat_id"),
                @Index(name = "idx_audit_log_showtime_id",  columnList = "showtime_id"),
                @Index(name = "idx_audit_log_booking_id",   columnList = "booking_id"),
                @Index(name = "idx_audit_log_created_at",   columnList = "created_at"),
                @Index(name = "idx_audit_log_action",       columnList = "action"),
                /* Hall display / ESP32 re-sync queries filter on showtime + time range */
                @Index(name = "idx_audit_log_showtime_created", columnList = "showtime_id, created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The seat whose state changed — nullable for non-seat actions (e.g. SHOWTIME_CANCELLED) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id")
    private Seat seat;

    /** The showtime context — nullable for cinema-level actions */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "showtime_id")
    private Showtime showtime;

    /** The booking that triggered this transition — null for admin overrides */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    /** User or kiosk that caused the action — null for scheduled system tasks */
    @Column(name = "actor_id")
    private Long actorId;

    /** "USER", "KIOSK", "SYSTEM" — kept as string so no FK dependency */
    @Column(name = "actor_type", length = 20)
    private String actorType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private AuditAction action;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_state", length = 20)
    private SeatState fromState;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_state", length = 20)
    private SeatState toState;

    /** Optional freeform context: error message, admin note, MQTT topic, etc. */
    @Column(length = 500)
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}