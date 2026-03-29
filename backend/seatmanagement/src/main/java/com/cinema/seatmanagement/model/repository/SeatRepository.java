package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.Seat;
import com.cinema.seatmanagement.model.enums.SeatType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {

    /** Used by seat-map: active seats only, sorted for grid rendering */
    List<Seat> findByScreenIdAndIsActiveTrueOrderByRowLabelAscColNumberAsc(Long screenId);

    /** Kept for admin views that need to see inactive (disabled) seats too */
    List<Seat> findByScreenIdOrderByRowLabelAscColNumberAsc(Long screenId);

    List<Seat> findByScreenIdAndIsActiveTrue(Long screenId);

    Optional<Seat> findByScreenIdAndRowLabelAndColNumber(Long screenId, String rowLabel, Integer colNumber);

    /** LED re-sync: fetch all seats that have a mapped LED for a given screen */
    @Query("SELECT s FROM Seat s WHERE s.screen.id = :screenId AND s.ledIndex IS NOT NULL AND s.isActive = true")
    List<Seat> findMappedLedSeatsByScreenId(@Param("screenId") Long screenId);

    /** Seat type filter — used by PricingEngine decorator selection */
    List<Seat> findByScreenIdAndSeatTypeAndIsActiveTrue(Long screenId, SeatType seatType);

    /** Count of active seats — quick validation against screen.totalSeats */
    long countByScreenIdAndIsActiveTrue(Long screenId);
}