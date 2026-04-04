package com.cinema.seatmanagement.model.entity;

// ============================================================
// CHANGES FROM ORIGINAL:
//  + permanentQrPayload (String)  — SEAT:... payload, permanent, never changes
//  + permanentQrImage   (String)  — Base64 PNG of the permanent seat QR
//
// These are generated ONCE when the seat is created (or on demand by admin).
// The QR is printed and physically affixed to the seat.
// It encodes: SEAT:{seatId}:{screenId}:{rowLabel}:{colNumber}:{hmac}
// ============================================================

import com.cinema.seatmanagement.model.enums.SeatType;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "seat",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_seat_screen_row_col",
                        columnNames = {"screen_id", "row_label", "col_number"})
        },
        indexes = {
                @Index(name = "idx_seat_screen_id",   columnList = "screen_id"),
                @Index(name = "idx_seat_led_index",   columnList = "led_index"),
                @Index(name = "idx_seat_is_active",   columnList = "is_active")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "screen_id", nullable = false)
    private Screen screen;

    @Column(name = "row_label", nullable = false, length = 5)
    private String rowLabel;      // e.g. "A", "B"

    @Column(name = "col_number", nullable = false)
    private Integer colNumber;    // e.g. 1, 2, 3

    @Enumerated(EnumType.STRING)
    @Column(name = "seat_type", length = 20)
    @Builder.Default
    private SeatType seatType = SeatType.STANDARD;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    /**
     * Physical LED index (0-based) on the ESP32/LED controller for this seat.
     * NULL means this seat has no dedicated LED.
     *
     * With 6 LEDs: seats A-1 through A-6 get ledIndex 0..5.
     * The MQTT command topic cinema/{screenId}/led uses this index to identify
     * which LED to turn on/blink/off.
     */
    @Column(name = "led_index")
    private Integer ledIndex;

    // ── NEW: Permanent Seat QR fields ────────────────────────────────────────

    /**
     * The permanent QR payload for this physical seat.
     * Format: SEAT:{seatId}:{screenId}:{rowLabel}:{colNumber}:{hmac}
     *
     * Generated once, stored permanently. Used by customers to confirm they
     * have sat in the correct seat (step 10 of the IoT flow).
     *
     * Max 500 chars: "SEAT:" + ids + labels + HMAC (43) + colons.
     */
    @Column(name = "permanent_qr_payload", length = 500)
    private String permanentQrPayload;

    /**
     * Base64 PNG of the permanent seat QR.
     * Printed and physically affixed to each seat.
     * Admin can regenerate this via /api/admin/seats/{id}/qr if the label is damaged.
     */
    @Column(name = "permanent_qr_image", columnDefinition = "TEXT")
    private String permanentQrImage;

    // ── End NEW ──────────────────────────────────────────────────────────────

    @OneToMany(mappedBy = "seat", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<BookingSeat> bookingSeats = new ArrayList<>();

    /** Convenience label for display and logging: "A-3" */
    @Transient
    public String getLabel() {
        return rowLabel + "-" + colNumber;
    }
}