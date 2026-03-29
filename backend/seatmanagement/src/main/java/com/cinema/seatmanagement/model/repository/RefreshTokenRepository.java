package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    /** Revokes all sessions for a user on password change or account deactivation */
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);

    /**
     * Scheduled nightly cleanup — uses the idx_refresh_token_expires_at index.
     * Keeps the refresh_token table lean on a high-traffic deployment.
     */
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiresAt < :now")
    void deleteAllExpiredTokens(@Param("now") LocalDateTime now);

    /** Count of active sessions per user — useful for admin security view */
    long countByUserId(Long userId);
}