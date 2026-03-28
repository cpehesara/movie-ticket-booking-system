package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.service.interfaces.ShowtimeService;
import com.cinema.seatmanagement.view.dto.response.ShowtimeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/showtimes")
@RequiredArgsConstructor
public class ShowtimeController {

    private final ShowtimeService showtimeService;

    @GetMapping
    public ResponseEntity<List<ShowtimeResponse>> getShowtimes(
            @RequestParam Long movieId,
            @RequestParam(defaultValue = "false") boolean upcomingOnly
    ) {
        List<ShowtimeResponse> showtimes;

        if (upcomingOnly) {
            showtimes = showtimeService.getUpcomingShowtimesByMovie(movieId);
        } else {
            showtimes = showtimeService.getShowtimesByMovie(movieId);
        }

        return ResponseEntity.ok(showtimes);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShowtimeResponse> getShowtimeById(@PathVariable Long id) {
        ShowtimeResponse showtime = showtimeService.getShowtimeById(id);
        return ResponseEntity.ok(showtime);
    }
}