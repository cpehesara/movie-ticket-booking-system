package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.Kiosk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface KioskRepository extends JpaRepository<Kiosk, Long> {

    Optional<Kiosk> findByApiKey(String apiKey);

    List<Kiosk> findByScreenId(Long screenId);

    boolean existsByApiKey(String apiKey);
}