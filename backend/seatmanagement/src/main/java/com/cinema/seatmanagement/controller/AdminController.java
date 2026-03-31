package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.entity.Kiosk;
import com.cinema.seatmanagement.model.entity.Movie;
import com.cinema.seatmanagement.model.entity.Screen;
import com.cinema.seatmanagement.model.entity.Showtime;
import com.cinema.seatmanagement.model.enums.UserRole;
import com.cinema.seatmanagement.model.repository.KioskRepository;
import com.cinema.seatmanagement.model.repository.MovieRepository;
import com.cinema.seatmanagement.model.repository.ScreenRepository;
import com.cinema.seatmanagement.model.repository.UserRepository;
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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

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
    private final UserRepository userRepository;

    // ── Movie Management ──────────────────────────────────────────────────────

    @PostMapping("/movies")
    public ResponseEntity<MovieResponse> createMovie(@RequestBody Movie movie) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(movieService.createMovie(movie));
    }

    @PutMapping("/movies/{id}")
    public ResponseEntity<MovieResponse> updateMovie(
            @PathVariable Long id, @RequestBody Movie movie) {
        return ResponseEntity.ok(movieService.updateMovie(id, movie));
    }

    @DeleteMapping("/movies/{id}")
    public ResponseEntity<Void> deleteMovie(@PathVariable Long id) {
        movieService.deleteMovie(id);
        return ResponseEntity.noContent().build();
    }

    // ── Showtime Management ───────────────────────────────────────────────────

    @PostMapping("/showtimes")
    public ResponseEntity<ShowtimeResponse> createShowtime(@RequestBody Showtime showtime) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(showtimeService.createShowtime(showtime));
    }

    @PutMapping("/showtimes/{id}")
    public ResponseEntity<ShowtimeResponse> updateShowtime(
            @PathVariable Long id, @RequestBody Showtime showtime) {
        return ResponseEntity.ok(showtimeService.updateShowtime(id, showtime));
    }

    @DeleteMapping("/showtimes/{id}")
    public ResponseEntity<Void> cancelShowtime(@PathVariable Long id) {
        showtimeService.cancelShowtime(id);
        return ResponseEntity.noContent().build();
    }

    // ── Screen Listing ────────────────────────────────────────────────────────

    @GetMapping("/screens")
    public ResponseEntity<List<Map<String, Object>>> getAllScreens() {
        List<Map<String, Object>> screens = screenRepository.findAll()
                .stream()
                .map(screen -> {
                    Map<String, Object> dto = new HashMap<>();
                    dto.put("id",         screen.getId());
                    dto.put("name",       screen.getName());
                    dto.put("totalSeats", screen.getTotalSeats());
                    dto.put("cinemaName", screen.getCinema() != null
                            ? screen.getCinema().getName() : "");
                    dto.put("cinemaId",   screen.getCinema() != null
                            ? screen.getCinema().getId() : null);
                    return dto;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(screens);
    }

    // ── Seat State Override ───────────────────────────────────────────────────

    @PatchMapping("/seats/{seatId}/state")
    public ResponseEntity<Void> updateSeatState(
            @PathVariable Long seatId,
            @Valid @RequestBody SeatStateUpdateRequest request,
            @AuthenticationPrincipal UserDetails principal
    ) {
        Long actingUserId = userRepository.findByEmail(principal.getUsername())
                .map(u -> u.getId())
                .orElse(null);

        seatService.updateSeatState(
                seatId,
                request.getShowtimeId(),
                request.getNewState(),
                actingUserId
        );
        return ResponseEntity.ok().build();
    }

    // ── Booking Overview ──────────────────────────────────────────────────────

    @GetMapping("/bookings")
    public ResponseEntity<List<BookingResponse>> getAllBookings() {
        return ResponseEntity.ok(bookingService.getAllBookings());
    }

    @GetMapping("/bookings/showtime/{showtimeId}")
    public ResponseEntity<List<BookingResponse>> getBookingsByShowtime(
            @PathVariable Long showtimeId) {
        return ResponseEntity.ok(bookingService.getBookingsByShowtime(showtimeId));
    }

    // ── Staff Management ──────────────────────────────────────────────────────

    @PostMapping("/staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponse> registerStaff(
            @Valid @RequestBody RegisterRequest request,
            @RequestParam String role,
            @RequestParam Long cinemaId
    ) {
        // The compiled AuthService interface requires UserRole, not String.
        // Convert here so the call site matches the interface exactly.
        // valueOf() throws IllegalArgumentException for unknown values,
        // which Spring maps to 400 Bad Request automatically.
        UserRole userRole = UserRole.valueOf(role.toUpperCase());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(authService.registerStaff(request, userRole, cinemaId));
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

    // ── Kiosk Management ─────────────────────────────────────────────────────

    @PostMapping("/kiosks")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> registerKiosk(
            @RequestParam Long screenId,
            @RequestParam(required = false) String name
    ) {
        Screen screen = screenRepository.findById(screenId)
                .orElseThrow(() -> new EntityNotFoundException("Screen not found: " + screenId));

        String apiKey = "KIOSK-" + UUID.randomUUID();

        Kiosk kiosk = Kiosk.builder()
                .screen(screen)
                .apiKey(apiKey)
                .name(name != null ? name : "Kiosk-" + screenId)
                .isActive(true)
                .build();
        kiosk = kioskRepository.save(kiosk);

        Map<String, Object> response = new HashMap<>();
        response.put("kioskId",  kiosk.getId());
        response.put("screenId", screenId);
        response.put("apiKey",   apiKey);
        response.put("name",     kiosk.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}