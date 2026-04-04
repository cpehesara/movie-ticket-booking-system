package com.cinema.seatmanagement.controller;
import com.cinema.seatmanagement.model.repository.CinemaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/cinemas")
@RequiredArgsConstructor
public class CinemaController {
    private final CinemaRepository cinemaRepository;
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllCinemas() {
        List<Map<String, Object>> res = cinemaRepository.findAll().stream().map(c -> Map.of("id", (Object)c.getId(), "name", c.getName(), "location", c.getLocation() != null ? c.getLocation() : "")).collect(Collectors.toList());
        return ResponseEntity.ok(res);
    }
}
