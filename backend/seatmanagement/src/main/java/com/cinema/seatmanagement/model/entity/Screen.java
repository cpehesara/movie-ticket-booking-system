package com.cinema.seatmanagement.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "screen",
        indexes = {
                @Index(name = "idx_screen_cinema_id", columnList = "cinema_id"),
                @Index(name = "idx_screen_name",      columnList = "name")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Screen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cinema_id", nullable = false)
    private Cinema cinema;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(name = "total_seats", nullable = false)
    private Integer totalSeats;

    @Column(name = "rows_count", nullable = false)
    private Integer rowsCount;

    @Column(name = "cols_count", nullable = false)
    private Integer colsCount;

    /** Unique ID sent to ESP32 over MQTT. Decoupled from PK so it never changes
     *  even if rows are migrated. Format: "SCREEN-{id}-{cinema_id}" set at insert. */
    @Column(name = "mqtt_screen_ref", unique = true, length = 50)
    private String mqttScreenRef;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "screen", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Seat> seats = new ArrayList<>();

    @OneToMany(mappedBy = "screen", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Showtime> showtimes = new ArrayList<>();

    @OneToMany(mappedBy = "screen", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Kiosk> kiosks = new ArrayList<>();
}