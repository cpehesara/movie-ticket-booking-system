package com.cinema.seatmanagement.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "kiosk",
        indexes = {
                @Index(name = "idx_kiosk_screen_id",  columnList = "screen_id"),
                @Index(name = "idx_kiosk_is_active",  columnList = "is_active")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Kiosk {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "screen_id", nullable = false)
    private Screen screen;

    /** Hashed API key sent in X-API-Key header for kiosk authentication */
    @Column(name = "api_key", nullable = false, unique = true, length = 255)
    private String apiKey;

    @Column(length = 100)
    private String name;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    /** Set by ESP32 heartbeat handler; null means never seen online */
    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}