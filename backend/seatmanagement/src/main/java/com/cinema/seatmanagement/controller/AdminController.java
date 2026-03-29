package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.entity.Kiosk;
import com.cinema.seatmanagement.model.entity.Movie;
import com.cinema.seatmanagement.model.entity.Screen;
import com.cinema.seatmanagement.model.entity.Showtime;
import com.cinema.seatmanagement.model.enums.UserRole;
import com.cinema.seatmanagement.model.repository.KioskRepository;
import com.cinema.seatmanagement.model.repository.ScreenRepository;
import com.cinema.seatmanagement.model.service.interfaces.*;
import com.cinema.seatmanagement.security.JwtTokenProvider;
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

    private final MovieService     movieService;
    private final ShowtimeService  showtimeService;
    private final BookingService   bookingService;
    private final SeatService      seatService;
    private final UserService      userService;
    private final AuthService      authService;
    private final KioskRepository  kioskRepository;
    private final ScreenRepository screenRepository;
    private final JwtTokenProvider jwtTokenProvider;

    // ── Movie Management ──────────────────────────────────────────────────

    @PostMapping("/movies")
    public ResponseEntity<MovieResponse> createMovie(@RequestBody Movie movie) {
        return ResponseEntity.status(HttpStatus.CREATED).body(movieService.createMovie(movie));
    }

    @PutMapping("/movies/{id}")
    public ResponseEntity<MovieResponse> updateMovie(
            @PathVariable Long id,
            @RequestBody Movie movie
    ) {
        return ResponseEntity.ok(movieService.updateMovie(id, movie));
    }

    @DeleteMapping("/movies/{id}")
    public ResponseEntity<Void> deleteMovie(@PathVariable Long id) {
        movieService.deleteMovie(id);
        return ResponseEntity.noContent().build();
    }

    // ── Showtime Management ───────────────────────────────────────────────

    @PostMapping("/showtimes")
    public ResponseEntity<ShowtimeResponse> createShowtime(@RequestBody Showtime showtime) {
        return ResponseEntity.status(HttpStatus.CREATED).body(showtimeService.createShowtime(showtime));
    }

    @PutMapping("/showtimes/{id}")
    public ResponseEntity<ShowtimeResponse> updateShowtime(
            @PathVariable Long id,
            @RequestBody Showtime showtime
    ) {
        return ResponseEntity.ok(showtimeService.updateShowtime(id, showtime));
    }

    @DeleteMapping("/showtimes/{id}")
    public ResponseEntity<Void> cancelShowtime(@PathVariable Long id) {
        showtimeService.cancelShowtime(id);
        return ResponseEntity.noContent().build();
    }

    // ── Seat State Override ───────────────────────────────────────────────

    @PatchMapping("/seats/{seatId}/state")
    public ResponseEntity<Void> updateSeatState(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long seatId,
            @Valid @RequestBody SeatStateUpdateRequest request
    ) {
        Long actorId = jwtTokenProvider.getUserIdFromToken(authHeader.substring(7));
        seatService.updateSeatState(seatId, request.getShowtimeId(), request.getNewState(), actorId);
        return ResponseEntity.ok().build();
    }

    // ── Booking Overview ──────────────────────────────────────────────────

    @GetMapping("/bookings")
    public ResponseEntity<List<BookingResponse>> getAllBookings() {
        return ResponseEntity.ok(bookingService.getAllBookings());
    }

    @GetMapping("/bookings/showtime/{showtimeId}")
    public ResponseEntity<List<BookingResponse>> getBookingsByShowtime(@PathVariable Long showtimeId) {
        return ResponseEntity.ok(bookingService.getBookingsByShowtime(showtimeId));
    }

    // ── Staff Management ──────────────────────────────────────────────────

    @PostMapping("/staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponse> registerStaff(
            @Valid @RequestBody RegisterRequest request,
            @RequestParam UserRole role,            // Typed enum — invalid values return 400 automatically
            @RequestParam Long cinemaId
    ) {
        AuthResponse response = authService.registerStaff(request, role, cinemaId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/staff")
    public ResponseEntity<List<UserResponse>> getAllStaff() {
        return ResponseEntity.ok(userService.getAllStaff());
    }

    @GetMapping("/staff/cinema/{cinemaId}")
    public ResponseEntity<List<UserResponse>> getStaffByCinema(@PathVariable Long cinemaId) {
        return ResponseEntity.ok(userService.getStaffByCinema(cinemaId));
    }

    @DeleteMapping("/staff/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivateStaff(@PathVariable Long userId) {
        userService.deactivateUser(userId);
        return ResponseEntity.noContent().build();
    }

    // ── Kiosk Management ─────────────────────────────────────────────────

    @PostMapping("/kiosks")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> registerKiosk(
            @RequestParam Long screenId,
            @RequestParam(required = false) String name
    ) {
        Screen screen = screenRepository.findById(screenId)
                .orElseThrow(() -> new EntityNotFoundException("Screen not found with id: " + screenId));

        String apiKey = "KIOSK-" + UUID.randomUUID().toString();

        Kiosk kiosk = kioskRepository.save(
                Kiosk.builder()
                        .screen(screen)
                        .apiKey(apiKey)
                        .name(name != null ? name : "Kiosk-" + screenId)
                        .isActive(true)
                        .build()
        );

        Map<String, Object> response = new HashMap<>();
        response.put("kioskId",  kiosk.getId());
        response.put("screenId", screenId);
        response.put("apiKey",   apiKey);
        response.put("name",     kiosk.getName());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── LED Re-sync (ESP32 reconnect) ─────────────────────────────────────

    @PostMapping("/screens/{screenId}/resync-leds")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'OPERATOR')")
    public ResponseEntity<Void> resyncLeds(
            @PathVariable Long screenId,
            @RequestParam Long showtimeId
    ) {
        seatService.resyncLedsForShowtime(showtimeId);
        return ResponseEntity.ok().build();
    }
}