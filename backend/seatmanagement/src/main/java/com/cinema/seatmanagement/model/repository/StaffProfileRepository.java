package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.StaffProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StaffProfileRepository extends JpaRepository<StaffProfile, Long> {

    Optional<StaffProfile> findByUserId(Long userId);

    List<StaffProfile> findByCinemaId(Long cinemaId);

    boolean existsByUserId(Long userId);
}