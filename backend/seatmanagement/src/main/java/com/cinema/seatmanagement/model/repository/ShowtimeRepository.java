package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.Showtime;
import com.cinema.seatmanagement.model.enums.ShowtimeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ShowtimeRepository extends JpaRepository<Showtime, Long> {

    List<Showtime> findByMovieId(Long movieId);

    List<Showtime> findByScreenId(Long screenId);

    /**
     * Uses composite index (movie_id, status) — covers the most common
     * customer-facing query: "upcoming SCHEDULED/OPEN showtimes for this movie".
     */
    List<Showtime> findByMovieIdAndStatus(Long movieId, ShowtimeStatus status);

    @Query("""
        SELECT s FROM Showtime s
        WHERE s.movie.id   = :movieId
          AND s.startTime  > :now
          AND s.status NOT IN ('COMPLETED', 'CANCELLED')
        ORDER BY s.startTime ASC
        """)
    List<Showtime> findUpcomingByMovieId(
            @Param("movieId") Long movieId,
            @Param("now")     LocalDateTime now
    );

    @Query("""
        SELECT s FROM Showtime s
        WHERE s.screen.id  = :screenId
          AND s.startTime BETWEEN :start AND :end
        """)
    List<Showtime> findByScreenIdAndTimeRange(
            @Param("screenId") Long screenId,
            @Param("start")    LocalDateTime start,
            @Param("end")      LocalDateTime end
    );

    /**
     * Finds showtimes that started but have not been marked IN_PROGRESS yet.
     * Called by a scheduled task every minute to auto-advance showtime status.
     */
    @Query("""
        SELECT s FROM Showtime s
        WHERE s.status    = 'SCHEDULED'
          AND s.startTime <= :now
        """)
    List<Showtime> findScheduledShowtimesThatHaveStarted(@Param("now") LocalDateTime now);

    /**
     * Finds showtimes that ended but are still IN_PROGRESS.
     * Called by the same scheduler to auto-complete and trigger seat release.
     */
    @Query("""
        SELECT s FROM Showtime s
        WHERE s.status  = 'IN_PROGRESS'
          AND s.endTime <= :now
        """)
    List<Showtime> findInProgressShowtimesThatHaveEnded(@Param("now") LocalDateTime now);

    /**
     * Bulk status update — used by the scheduler instead of load-and-save per row.
     */
    @Modifying
    @Query("UPDATE Showtime s SET s.status = :newStatus WHERE s.id = :id")
    void updateStatus(@Param("id") Long id, @Param("newStatus") ShowtimeStatus newStatus);
}