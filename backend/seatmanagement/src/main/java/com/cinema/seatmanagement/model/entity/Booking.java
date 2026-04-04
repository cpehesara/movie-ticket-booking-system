package com.cinema.seatmanagement.model.entity;

// ============================================================
// CHANGES FROM ORIGINAL:
//  + qrCodeData     (String, col: qr_code_data)   — raw QR payload stored for "My Bookings" page
//  + qrCodeImage    (String, col: qr_code_image)  — Base64 PNG stored for email + customer portal
// ============================================================

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
                @Index(name = "idx_booking_user_id",       columnList = "user_id"),
                @Index(name = "idx_booking_showtime_id",   columnList = "showtime_id"),
                @Index(name = "idx_booking_status",        columnList = "status"),
                @Index(name = "idx_booking_booked_at",     columnList = "booked_at"),
                @Index(name = "idx_booking_booking_code",  columnList = "booking_code"),
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

    // ── NEW: QR Code fields ──────────────────────────────────────────────────

    /**
     * The raw QR payload string (BOOKING:{bookingCode}:{showtimeId}:{userId}:{hmac}).
     * Stored so the customer portal can display it without re-generating,
     * and so the door scanner can decode and re-validate without image parsing.
     *
     * Max length 500 covers: "BOOKING:" (8) + bookingCode (20) + IDs + HMAC (43) + delimiters.
     */
    @Column(name = "qr_code_data", length = 500)
    private String qrCodeData;

    /**
     * Base64-encoded PNG of the booking QR code.
     * Stored as TEXT (mapped to CLOB/TEXT in DB).
     * Used in:
     *   - Booking confirmation email (inline data: URI)
     *   - Customer portal "My Bookings" QR display
     *   - Mobile app offline display
     *
     * ~50 KB per QR image is acceptable for a TEXT column.
     * If storage is a concern, this can be generated on-the-fly and not stored.
     */
    @Column(name = "qr_code_image", columnDefinition = "TEXT")
    private String qrCodeImage;

    // ── End NEW ──────────────────────────────────────────────────────────────

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