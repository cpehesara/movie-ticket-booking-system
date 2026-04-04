package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.Booking;
import com.cinema.seatmanagement.model.enums.BookingStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    @EntityGraph(value = "Booking.withSeatsAndShowtime")
    Optional<Booking> findByBookingCode(String bookingCode);

    @EntityGraph(value = "Booking.withSeatsAndShowtime")
    List<Booking> findByUserIdOrderByBookedAtDesc(Long userId);

    /**
     * FIX: Added missing findWithDetailsById — used by PaymentServiceImpl.
     * Loads booking with seats+showtime+movie+screen in one query.
     */
    @EntityGraph(value = "Booking.withSeatsAndShowtime")
    Optional<Booking> findWithDetailsById(Long id);

    @Query("""
        SELECT b FROM Booking b
        WHERE b.user.id      = :userId
          AND b.showtime.id  = :showtimeId
          AND b.status NOT IN ('CANCELLED', 'EXPIRED')
        """)
    Optional<Booking> findActiveByUserAndShowtime(
            @Param("userId")     Long userId,
            @Param("showtimeId") Long showtimeId
    );

    List<Booking> findByUserId(Long userId);

    List<Booking> findByShowtimeId(Long showtimeId);

    List<Booking> findByStatus(BookingStatus status);

    @Query("""
        SELECT b FROM Booking b
        WHERE b.status   = 'PENDING'
          AND b.bookedAt < :cutoff
        """)
    List<Booking> findPendingBookingsOlderThan(@Param("cutoff") LocalDateTime cutoff);

    long countByShowtimeIdAndStatus(Long showtimeId, BookingStatus status);

    @Modifying
    @Query("UPDATE Booking b SET b.status = 'EXPIRED' WHERE b.id = :id")
    void markExpired(@Param("id") Long id);
}