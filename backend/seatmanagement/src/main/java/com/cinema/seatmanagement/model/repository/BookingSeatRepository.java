package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.model.enums.SeatState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingSeatRepository extends JpaRepository<BookingSeat, Long> {

    @Query("""
        SELECT bs FROM BookingSeat bs
        JOIN FETCH bs.booking b
        JOIN FETCH b.user
        WHERE bs.seat.id     = :seatId
          AND bs.showtime.id = :showtimeId
        """)
    Optional<BookingSeat> findBySeatIdAndShowtimeId(
            @Param("seatId")     Long seatId,
            @Param("showtimeId") Long showtimeId
    );

    @Query(value = """
        SELECT bs FROM BookingSeat bs
        WHERE bs.seat.id     = :seatId
          AND bs.showtime.id = :showtimeId
        """)
    @org.springframework.data.jpa.repository.Lock(
            value = jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    Optional<BookingSeat> findBySeatAndShowtimeForUpdate(
            @Param("seatId")     Long seatId,
            @Param("showtimeId") Long showtimeId
    );

    @Query("""
        SELECT bs FROM BookingSeat bs
        JOIN FETCH bs.seat s
        JOIN FETCH s.screen
        WHERE bs.booking.id = :bookingId
        """)
    List<BookingSeat> findByBookingId(@Param("bookingId") Long bookingId);

    List<BookingSeat> findByShowtimeId(Long showtimeId);

    List<BookingSeat> findBySeatState(SeatState state);

    List<BookingSeat> findByShowtimeIdAndSeatState(Long showtimeId, SeatState state);

    /**
     * FIX: Added missing findActiveByShowtimeId — used by ShowtimeServiceImpl.mapWithAvailability().
     * Returns all BookingSeats that are in an "active" (non-available) state for a showtime.
     */
    @Query("""
        SELECT bs FROM BookingSeat bs
        WHERE bs.showtime.id = :showtimeId
          AND bs.seatState IN ('RESERVED', 'BOOKED', 'GUIDING', 'OCCUPIED')
        """)
    List<BookingSeat> findActiveByShowtimeId(@Param("showtimeId") Long showtimeId);

    @Query("""
        SELECT COUNT(bs) FROM BookingSeat bs
        WHERE bs.showtime.id = :showtimeId
          AND bs.seatState IN ('RESERVED', 'BOOKED', 'GUIDING', 'OCCUPIED')
        """)
    long countOccupiedSeatsByShowtime(@Param("showtimeId") Long showtimeId);

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

    @Query("""
        SELECT bs FROM BookingSeat bs
        WHERE bs.seatState       = 'RESERVED'
          AND bs.stateUpdatedAt  < :cutoff
        """)
    List<BookingSeat> findExpiredReservations(@Param("cutoff") LocalDateTime cutoff);
}