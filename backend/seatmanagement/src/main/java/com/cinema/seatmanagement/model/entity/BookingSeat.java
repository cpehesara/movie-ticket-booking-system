package com.cinema.seatmanagement.model.entity;

import com.cinema.seatmanagement.model.enums.SeatState;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "booking_seat",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_booking_seat_seat_showtime", columnNames = {"seat_id", "showtime_id"})
        },
        indexes = {
                @Index(name = "idx_booking_seat_booking_id",  columnList = "booking_id"),
                @Index(name = "idx_booking_seat_showtime_id", columnList = "showtime_id"),
                @Index(name = "idx_booking_seat_seat_id",     columnList = "seat_id"),
                @Index(name = "idx_booking_seat_state",       columnList = "seat_state"),
                /* Composite: seat-map query needs showtime + state together */
                @Index(name = "idx_booking_seat_showtime_state", columnList = "showtime_id, seat_state")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id", nullable = false)
    private Seat seat;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "showtime_id", nullable = false)
    private Showtime showtime;

    @Enumerated(EnumType.STRING)
    @Column(name = "seat_state", length = 20)
    @Builder.Default
    private SeatState seatState = SeatState.RESERVED;

    /**
     * Tracks when this row was last state-changed.
     * Used by the expiry scheduler to find RESERVED rows older than TTL.
     */
    @UpdateTimestamp
    @Column(name = "state_updated_at")
    private LocalDateTime stateUpdatedAt;
}