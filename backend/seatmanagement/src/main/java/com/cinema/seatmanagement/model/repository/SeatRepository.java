package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {

    List<Seat> findByScreenIdAndIsActiveTrue(Long screenId);

    List<Seat> findByScreenIdOrderByRowLabelAscColNumberAsc(Long screenId);

    Optional<Seat> findByScreenIdAndRowLabelAndColNumber(Long screenId, String rowLabel, Integer colNumber);
}