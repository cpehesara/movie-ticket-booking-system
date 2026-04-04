package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.repository.ScreenRepository;
import com.cinema.seatmanagement.view.dto.response.ScreenResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/screens")
@RequiredArgsConstructor
public class ScreenController {
    
    private final ScreenRepository screenRepository;

    @GetMapping
    public ResponseEntity<List<ScreenResponse>> getAllScreens() {
        List<ScreenResponse> screens = screenRepository.findAll().stream()
            .map(s -> new ScreenResponse(s.getId(), s.getName(), s.getTotalSeats()))
            .collect(Collectors.toList());
        return ResponseEntity.ok(screens);
    }
}