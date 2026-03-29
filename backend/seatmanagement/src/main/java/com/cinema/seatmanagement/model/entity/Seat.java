package com.cinema.seatmanagement.model.entity;

import com.cinema.seatmanagement.model.enums.SeatType;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "seat",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_seat_screen_row_col", columnNames = {"screen_id", "row_label", "col_number"})
        },
        indexes = {
                @Index(name = "idx_seat_screen_id",  columnList = "screen_id"),
                @Index(name = "idx_seat_is_active",  columnList = "is_active"),
                @Index(name = "idx_seat_seat_type",  columnList = "seat_type")
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
    private String rowLabel;

    @Column(name = "col_number", nullable = false)
    private Integer colNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "seat_type", length = 20)
    @Builder.Default
    private SeatType seatType = SeatType.STANDARD;

    /**
     * Zero-based index of this seat's LED on the WS2812B strip wired to the ESP32
     * for this screen. NULL means no LED is mapped (e.g. aisle/gap seats).
     */
    @Column(name = "led_index")
    private Integer ledIndex;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @OneToMany(mappedBy = "seat", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<BookingSeat> bookingSeats = new ArrayList<>();
}