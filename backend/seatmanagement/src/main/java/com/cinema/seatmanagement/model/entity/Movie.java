package com.cinema.seatmanagement.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "movie",
        indexes = {
                @Index(name = "idx_movie_genre",        columnList = "genre"),
                @Index(name = "idx_movie_language",     columnList = "language"),
                @Index(name = "idx_movie_release_date", columnList = "release_date"),
                @Index(name = "idx_movie_is_active",    columnList = "is_active")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Movie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "duration_mins", nullable = false)
    private Integer durationMins;

    @Column(length = 50)
    private String genre;

    @Column(length = 30)
    private String language;

    /** e.g. PG, PG-13, R, U */
    @Column(length = 10)
    private String rating;

    @Column(name = "poster_url", length = 500)
    private String posterUrl;

    @Column(name = "trailer_url", length = 500)
    private String trailerUrl;

    @Column(name = "release_date")
    private LocalDate releaseDate;

    /** Soft-delete flag: false = pulled from listing but data retained */
    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "movie", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Showtime> showtimes = new ArrayList<>();

    @OneToMany(mappedBy = "movie", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Review> reviews = new ArrayList<>();
}