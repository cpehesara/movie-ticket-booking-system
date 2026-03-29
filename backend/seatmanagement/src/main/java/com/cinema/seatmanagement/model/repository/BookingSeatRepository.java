package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.model.enums.SeatState;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingSeatRepository extends JpaRepository<BookingSeat, Long> {

    List<BookingSeat> findByShowtimeId(Long showtimeId);

    List<BookingSeat> findByBookingId(Long bookingId);

    /**
     * Covered by composite index (showtime_id, seat_state) —
     * the most frequent query on the seat-map endpoint.
     */
    List<BookingSeat> findByShowtimeIdAndSeatState(Long showtimeId, SeatState seatState);

    /**
     * Returns all non-cancelled seats for a showtime.
     * Used by ShowtimeServiceImpl.mapWithAvailability() to count booked seats.
     * The composite index (showtime_id, seat_state) covers this filter.
     */
    @Query("""
        SELECT bs FROM BookingSeat bs
        WHERE bs.showtime.id = :showtimeId
          AND bs.seatState  != 'CANCELLED'
        """)
    List<BookingSeat> findActiveByShowtimeId(@Param("showtimeId") Long showtimeId);

    Optional<BookingSeat> findBySeatIdAndShowtimeId(Long seatId, Long showtimeId);

    /**
     * Pessimistic write lock — called inside the seat-selection transaction
     * to prevent two concurrent requests from reserving the same seat.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT bs FROM BookingSeat bs WHERE bs.seat.id = :seatId AND bs.showtime.id = :showtimeId")
    Optional<BookingSeat> findBySeatAndShowtimeForUpdate(
            @Param("seatId")     Long seatId,
            @Param("showtimeId") Long showtimeId
    );

    boolean existsBySeatIdAndShowtimeId(Long seatId, Long showtimeId);

    /**
     * Bulk state update for show-end cleanup (OCCUPIED → AVAILABLE).
     * A single UPDATE instead of loading every row into memory.
     * Called by a nightly or post-show scheduled task.
     */
    @Modifying
    @Query("""
        UPDATE BookingSeat bs
        SET bs.seatState = 'AVAILABLE', bs.stateUpdatedAt = :now
        WHERE bs.showtime.id = :showtimeId
          AND bs.seatState   = 'OCCUPIED'
        """)
    int releaseOccupiedSeatsForShowtime(
            @Param("showtimeId") Long showtimeId,
            @Param("now")        LocalDateTime now
    );
}