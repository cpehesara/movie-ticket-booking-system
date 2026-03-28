package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.service.interfaces.SeatService;
import com.cinema.seatmanagement.view.dto.response.SeatMapResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/seats")
@RequiredArgsConstructor
public class SeatController {

    private final SeatService seatService;

    @GetMapping("/{showtimeId}")
    public ResponseEntity<SeatMapResponse> getSeatMap(@PathVariable Long showtimeId) {
        SeatMapResponse response = seatService.getSeatMap(showtimeId);
        return ResponseEntity.ok(response);
    }
}