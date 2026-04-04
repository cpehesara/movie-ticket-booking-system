package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.repository.ScreenRepository;
import com.cinema.seatmanagement.model.repository.SeatRepository;
import com.cinema.seatmanagement.view.dto.response.ScreenResponse;
import com.cinema.seatmanagement.view.dto.response.SeatMapResponse.SeatInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/screens")
@RequiredArgsConstructor
public class ScreenController {
    
    private final ScreenRepository screenRepository;
    private final SeatRepository seatRepository;

    @GetMapping
    public ResponseEntity<List<ScreenResponse>> getAllScreens() {
        List<ScreenResponse> screens = screenRepository.findAll().stream()
            .map(s -> new ScreenResponse(s.getId(), s.getName(), s.getTotalSeats()))
            .collect(Collectors.toList());
        return ResponseEntity.ok(screens);
    }

    @GetMapping("/{screenId}/seats")
    public ResponseEntity<List<SeatInfo>> getSeatsByScreen(@PathVariable Long screenId) {
        List<SeatInfo> seats = seatRepository.findByScreenIdOrderByRowLabelAscColNumberAsc(screenId)
                .stream()
                .map(s -> SeatInfo.builder()
                        .seatId(s.getId())
                        .rowLabel(s.getRowLabel())
                        .colNumber(s.getColNumber())
                        .seatType(s.getSeatType() != null ? s.getSeatType().name() : "STANDARD")
                        .seatState("AVAILABLE")
                        .isActive(s.getIsActive())
                        .ledIndex(s.getLedIndex())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(seats);
    }
}