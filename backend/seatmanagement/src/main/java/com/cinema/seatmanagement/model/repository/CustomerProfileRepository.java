package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.CustomerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, Long> {

    Optional<CustomerProfile> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    /**
     * Single-column UPDATE for loyalty points — avoids loading the full entity
     * just to increment a counter. Called after every successful booking confirmation.
     */
    @Modifying
    @Query("UPDATE CustomerProfile cp SET cp.loyaltyPoints = cp.loyaltyPoints + :points WHERE cp.user.id = :userId")
    void addLoyaltyPoints(@Param("userId") Long userId, @Param("points") int points);
}