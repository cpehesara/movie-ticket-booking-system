package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.CustomerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, Long> {

    Optional<CustomerProfile> findByUserId(Long userId);

    boolean existsByUserId(Long userId);
}