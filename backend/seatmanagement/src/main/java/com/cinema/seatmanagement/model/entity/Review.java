package com.cinema.seatmanagement.model.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "review",
        uniqueConstraints = {
                /* One review per user per movie */
                @UniqueConstraint(name = "uq_review_user_movie", columnNames = {"user_id", "movie_id"})
        },
        indexes = {
                @Index(name = "idx_review_movie_id", columnList = "movie_id"),
                @Index(name = "idx_review_user_id",  columnList = "user_id"),
                @Index(name = "idx_review_rating",   columnList = "rating")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "movie_id", nullable = false)
    private Movie movie;

    @Min(1) @Max(5)
    @Column
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}