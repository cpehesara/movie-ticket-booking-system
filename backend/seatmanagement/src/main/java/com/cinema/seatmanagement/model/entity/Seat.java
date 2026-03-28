package com.cinema.seatmanagement.model.entity;

import com.cinema.seatmanagement.model.enums.SeatType;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "seat", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"screen_id", "row_label", "col_number"})
})
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

    @Column(name = "led_index")
    private Integer ledIndex;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @OneToMany(mappedBy = "seat", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<BookingSeat> bookingSeats = new ArrayList<>();
}