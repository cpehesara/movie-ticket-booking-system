package com.cinema.seatmanagement.model.repository;

import com.cinema.seatmanagement.model.entity.Screen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScreenRepository extends JpaRepository<Screen, Long> {

    List<Screen> findByCinemaId(Long cinemaId);
}