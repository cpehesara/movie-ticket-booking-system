package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.Booking;
import com.cinema.seatmanagement.model.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    Optional<Booking> findByBookingCode(String bookingCode);

    List<Booking> findByUserId(Long userId);

    List<Booking> findByUserIdOrderByBookedAtDesc(Long userId);

    List<Booking> findByShowtimeId(Long showtimeId);

    List<Booking> findByStatus(BookingStatus status);

    @Query("SELECT b FROM Booking b WHERE b.status = :status AND b.bookedAt < :cutoff")
    List<Booking> findExpiredReservations(
            @Param("status") BookingStatus status,
            @Param("cutoff") LocalDateTime cutoff
    );
}