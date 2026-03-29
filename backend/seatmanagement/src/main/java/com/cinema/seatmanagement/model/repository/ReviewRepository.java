package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByMovieIdOrderByCreatedAtDesc(Long movieId);

    List<Review> findByUserId(Long userId);

    boolean existsByUserIdAndMovieId(Long userId, Long movieId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.movie.id = :movieId")
    Double findAverageRatingByMovieId(@Param("movieId") Long movieId);

    /** Review count — used by MovieMapper without fetching the full list */
    long countByMovieId(Long movieId);

    /** Rating distribution for the movie detail page (bar chart) */
    @Query("""
        SELECT r.rating, COUNT(r) FROM Review r
        WHERE r.movie.id = :movieId
        GROUP BY r.rating
        ORDER BY r.rating
        """)
    List<Object[]> findRatingDistributionByMovieId(@Param("movieId") Long movieId);
}