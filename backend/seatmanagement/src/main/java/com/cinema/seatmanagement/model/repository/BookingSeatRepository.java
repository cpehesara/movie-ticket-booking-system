package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.model.enums.SeatState;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingSeatRepository extends JpaRepository<BookingSeat, Long> {

    List<BookingSeat> findByShowtimeId(Long showtimeId);

    List<BookingSeat> findByBookingId(Long bookingId);

    List<BookingSeat> findByShowtimeIdAndSeatState(Long showtimeId, SeatState seatState);

    Optional<BookingSeat> findBySeatIdAndShowtimeId(Long seatId, Long showtimeId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT bs FROM BookingSeat bs WHERE bs.seat.id = :seatId AND bs.showtime.id = :showtimeId")
    Optional<BookingSeat> findBySeatAndShowtimeForUpdate(
            @Param("seatId") Long seatId,
            @Param("showtimeId") Long showtimeId
    );

    boolean existsBySeatIdAndShowtimeId(Long seatId, Long showtimeId);
}