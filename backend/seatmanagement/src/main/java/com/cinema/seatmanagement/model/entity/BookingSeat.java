package com.cinema.seatmanagement.model.entity;

import com.cinema.seatmanagement.model.enums.SeatState;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "booking_seat", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"seat_id", "showtime_id"})
})
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
}