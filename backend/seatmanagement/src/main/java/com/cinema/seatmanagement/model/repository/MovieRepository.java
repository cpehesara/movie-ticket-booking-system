package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.Movie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MovieRepository extends JpaRepository<Movie, Long> {

    /** Only return active movies to all public-facing endpoints */
    List<Movie> findByIsActiveTrueOrderByReleaseDateDesc();

    List<Movie> findByGenreAndIsActiveTrue(String genre);

    List<Movie> findByLanguageAndIsActiveTrue(String language);

    List<Movie> findByGenreAndLanguageAndIsActiveTrue(String genre, String language);

    Optional<Movie> findByIdAndIsActiveTrue(Long id);

    /**
     * Full-text title search — LOWER + LIKE is sufficient for the demo scale.
     * On a production instance with 10 000+ movies, replace with a PostgreSQL
     * GIN index on a tsvector column and use ILIKE or full-text search.
     */
    @Query("""
        SELECT m FROM Movie m
        WHERE m.isActive = true
          AND LOWER(m.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
        ORDER BY m.releaseDate DESC
        """)
    List<Movie> searchByTitleActive(@Param("keyword") String keyword);

    /** Admin view — includes soft-deleted movies */
    @Query("SELECT m FROM Movie m WHERE LOWER(m.title) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Movie> searchByTitle(@Param("keyword") String keyword);

    List<Movie> findByGenre(String genre);

    List<Movie> findByLanguage(String language);

    List<Movie> findByGenreAndLanguage(String genre, String language);
}