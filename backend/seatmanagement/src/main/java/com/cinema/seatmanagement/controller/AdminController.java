package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.entity.Kiosk;
import com.cinema.seatmanagement.model.entity.Movie;
import com.cinema.seatmanagement.model.entity.Screen;
import com.cinema.seatmanagement.model.entity.Showtime;
import com.cinema.seatmanagement.model.repository.KioskRepository;
import com.cinema.seatmanagement.model.repository.MovieRepository;
import com.cinema.seatmanagement.model.repository.ScreenRepository;
import com.cinema.seatmanagement.model.service.interfaces.*;
import com.cinema.seatmanagement.view.dto.request.RegisterRequest;
import com.cinema.seatmanagement.view.dto.request.SeatStateUpdateRequest;
import com.cinema.seatmanagement.view.dto.response.AuthResponse;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;
import com.cinema.seatmanagement.view.dto.response.MovieResponse;
import com.cinema.seatmanagement.view.dto.response.ShowtimeResponse;
import com.cinema.seatmanagement.view.dto.response.UserResponse;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
@RequiredArgsConstructor
public class AdminController {

    private final MovieService movieService;
    private final ShowtimeService showtimeService;
    private final BookingService bookingService;
    private final SeatService seatService;
    private final UserService userService;
    private final AuthService authService;
    private final KioskRepository kioskRepository;
    private final ScreenRepository screenRepository;
    private final MovieRepository movieRepository;

    // ── Movie Management ──

    @PostMapping("/movies")
    public ResponseEntity<MovieResponse> createMovie(@RequestBody Movie movie) {
        MovieResponse response = movieService.createMovie(movie);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/movies/{id}")
    public ResponseEntity<MovieResponse> updateMovie(@PathVariable Long id, @RequestBody Movie movie) {
        MovieResponse response = movieService.updateMovie(id, movie);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/movies/{id}")
    public ResponseEntity<Void> deleteMovie(@PathVariable Long id) {
        movieService.deleteMovie(id);
        return ResponseEntity.noContent().build();
    }

    // ── Showtime Management ──

    @PostMapping("/showtimes")
    public ResponseEntity<ShowtimeResponse> createShowtime(@RequestBody Showtime showtime) {
        ShowtimeResponse response = showtimeService.createShowtime(showtime);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/showtimes/{id}")
    public ResponseEntity<ShowtimeResponse> updateShowtime(@PathVariable Long id, @RequestBody Showtime showtime) {
        ShowtimeResponse response = showtimeService.updateShowtime(id, showtime);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/showtimes/{id}")
    public ResponseEntity<Void> cancelShowtime(@PathVariable Long id) {
        showtimeService.cancelShowtime(id);
        return ResponseEntity.noContent().build();
    }

    // ── Seat State Override ──

    @PatchMapping("/seats/{seatId}/state")
    public ResponseEntity<Void> updateSeatState(
            @PathVariable Long seatId,
            @Valid @RequestBody SeatStateUpdateRequest request
    ) {
        seatService.updateSeatState(seatId, request.getShowtimeId(), request.getNewState());
        return ResponseEntity.ok().build();
    }

    // ── Booking Overview ──

    @GetMapping("/bookings")
    public ResponseEntity<List<BookingResponse>> getAllBookings() {
        List<BookingResponse> bookings = bookingService.getAllBookings();
        return ResponseEntity.ok(bookings);
    }

    @GetMapping("/bookings/showtime/{showtimeId}")
    public ResponseEntity<List<BookingResponse>> getBookingsByShowtime(@PathVariable Long showtimeId) {
        List<BookingResponse> bookings = bookingService.getBookingsByShowtime(showtimeId);
        return ResponseEntity.ok(bookings);
    }

    // ── Staff Management ──

    @PostMapping("/staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponse> registerStaff(
            @Valid @RequestBody RegisterRequest request,
            @RequestParam String role,
            @RequestParam Long cinemaId
    ) {
        AuthResponse response = authService.registerStaff(request, role, cinemaId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/staff")
    public ResponseEntity<List<UserResponse>> getAllStaff() {
        List<UserResponse> staff = userService.getAllStaff();
        return ResponseEntity.ok(staff);
    }

    @GetMapping("/staff/cinema/{cinemaId}")
    public ResponseEntity<List<UserResponse>> getStaffByCinema(@PathVariable Long cinemaId) {
        List<UserResponse> staff = userService.getStaffByCinema(cinemaId);
        return ResponseEntity.ok(staff);
    }

    @DeleteMapping("/staff/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivateStaff(@PathVariable Long userId) {
        userService.deactivateUser(userId);
        return ResponseEntity.noContent().build();
    }

    // ── Kiosk Management ──

    @PostMapping("/kiosks")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> registerKiosk(
            @RequestParam Long screenId,
            @RequestParam(required = false) String name
    ) {
        Screen screen = screenRepository.findById(screenId)
                .orElseThrow(() -> new EntityNotFoundException("Screen not found with id: " + screenId));

        String apiKey = "KIOSK-" + UUID.randomUUID().toString();

        Kiosk kiosk = Kiosk.builder()
                .screen(screen)
                .apiKey(apiKey)
                .name(name != null ? name : "Kiosk-" + screenId)
                .isActive(true)
                .build();
        kiosk = kioskRepository.save(kiosk);

        Map<String, Object> response = new HashMap<>();
        response.put("kioskId", kiosk.getId());
        response.put("screenId", screenId);
        response.put("apiKey", apiKey);
        response.put("name", kiosk.getName());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}