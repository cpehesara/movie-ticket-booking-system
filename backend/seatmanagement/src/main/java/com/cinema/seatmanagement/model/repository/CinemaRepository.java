package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.Cinema;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CinemaRepository extends JpaRepository<Cinema, Long> {

    /** Public listing — hides deactivated cinemas */
    List<Cinema> findByIsActiveTrueOrderByNameAsc();

    /** Admin view — all cinemas including inactive */
    List<Cinema> findAllByOrderByNameAsc();

    Optional<Cinema> findByIdAndIsActiveTrue(Long id);

    boolean existsByNameIgnoreCase(String name);
}