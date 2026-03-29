package com.cinema.seatmanagement.model.entity;

import com.cinema.seatmanagement.model.enums.BookingStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "booking",
        indexes = {
                @Index(name = "idx_booking_user_id",     columnList = "user_id"),
                @Index(name = "idx_booking_showtime_id", columnList = "showtime_id"),
                @Index(name = "idx_booking_status",      columnList = "status"),
                @Index(name = "idx_booking_booked_at",   columnList = "booked_at"),
                /* Composite: expiry scheduler queries PENDING bookings older than cutoff */
                @Index(name = "idx_booking_status_booked_at", columnList = "status, booked_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@NamedEntityGraphs({
        @NamedEntityGraph(
                name = "Booking.withSeatsAndShowtime",
                attributeNodes = {
                        @NamedAttributeNode("bookingSeats"),
                        @NamedAttributeNode(value = "showtime", subgraph = "showtime.withMovie"),
                },
                subgraphs = {
                        @NamedSubgraph(
                                name = "showtime.withMovie",
                                attributeNodes = { @NamedAttributeNode("movie"), @NamedAttributeNode("screen") }
                        )
                }
        )
})
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "showtime_id", nullable = false)
    private Showtime showtime;

    @Column(name = "booking_code", nullable = false, unique = true, length = 20)
    private String bookingCode;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private BookingStatus status = BookingStatus.PENDING;

    @CreationTimestamp
    @Column(name = "booked_at", updatable = false)
    private LocalDateTime bookedAt;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;

    /**
     * JPA optimistic locking: prevents concurrent updates from silently overwriting
     * each other. Any stale update throws OptimisticLockException → 409 to client.
     */
    @Version
    @Builder.Default
    private Integer version = 0;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<BookingSeat> bookingSeats = new ArrayList<>();

    @OneToOne(mappedBy = "booking", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Payment payment;
}