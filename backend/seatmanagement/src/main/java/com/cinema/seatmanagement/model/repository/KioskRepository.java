package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.Kiosk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface KioskRepository extends JpaRepository<Kiosk, Long> {

    Optional<Kiosk> findByApiKey(String apiKey);

    List<Kiosk> findByScreenId(Long screenId);

    List<Kiosk> findByIsActiveTrueAndScreenId(Long screenId);

    boolean existsByApiKey(String apiKey);

    /**
     * Used by MqttSubscriber.handleHeartbeat() — looks up kiosks by the
     * screen's stable mqttScreenRef extracted from the MQTT topic.
     * Returns a list because one screen can have multiple kiosks.
     */
    @Query("SELECT k FROM Kiosk k WHERE k.screen.mqttScreenRef = :mqttScreenRef AND k.isActive = true")
    List<Kiosk> findByScreenMqttRef(@Param("mqttScreenRef") String mqttScreenRef);

    /** Single-column UPDATE — stamps the heartbeat timestamp without loading the entity */
    @Modifying
    @Query("UPDATE Kiosk k SET k.lastSeenAt = :now WHERE k.id = :id")
    void updateLastSeenAt(@Param("id") Long id, @Param("now") LocalDateTime now);

    /**
     * Admin dashboard "offline kiosks" widget — uses idx_kiosk_is_active index.
     * Threshold = now - KIOSK_OFFLINE_THRESHOLD_MINUTES (from AppConstants).
     */
    @Query("""
        SELECT k FROM Kiosk k
        WHERE k.isActive = true
          AND (k.lastSeenAt IS NULL OR k.lastSeenAt < :threshold)
        """)
    List<Kiosk> findOfflineKiosks(@Param("threshold") LocalDateTime threshold);
}