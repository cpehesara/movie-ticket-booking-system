package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.Showtime;
import com.cinema.seatmanagement.model.enums.ShowtimeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ShowtimeRepository extends JpaRepository<Showtime, Long> {

    List<Showtime> findByMovieId(Long movieId);

    List<Showtime> findByScreenId(Long screenId);

    List<Showtime> findByMovieIdAndStatus(Long movieId, ShowtimeStatus status);

    @Query("SELECT s FROM Showtime s WHERE s.movie.id = :movieId AND s.startTime > :now ORDER BY s.startTime ASC")
    List<Showtime> findUpcomingByMovieId(@Param("movieId") Long movieId, @Param("now") LocalDateTime now);

    @Query("SELECT s FROM Showtime s WHERE s.screen.id = :screenId AND s.startTime BETWEEN :start AND :end")
    List<Showtime> findByScreenIdAndTimeRange(
            @Param("screenId") Long screenId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );
}
