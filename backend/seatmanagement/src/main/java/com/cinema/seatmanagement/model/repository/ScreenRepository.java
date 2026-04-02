package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.Screen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScreenRepository extends JpaRepository<Screen, Long> {

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"cinema"})
    @Query("SELECT s FROM Screen s")
    List<Screen> findAllWithCinema();

    List<Screen> findByCinemaId(Long cinemaId);

    List<Screen> findByCinemaIdAndIsActiveTrue(Long cinemaId);

    /** Used by MQTT heartbeat handler to resolve screenId from the stable ref string */
    Optional<Screen> findByMqttScreenRef(String mqttScreenRef);

    /**
     * Finds the screen that owns a given kiosk — used by KioskApiKeyFilter
     * to resolve screen context without a second query.
     */
    @Query("""
        SELECT s FROM Screen s
        JOIN s.kiosks k
        WHERE k.apiKey = :apiKey AND k.isActive = true
        """)
    Optional<Screen> findByActiveKioskApiKey(@Param("apiKey") String apiKey);
}