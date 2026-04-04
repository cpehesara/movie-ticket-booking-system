package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.entity.*;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.repository.*;
import com.cinema.seatmanagement.model.service.interfaces.*;
import com.cinema.seatmanagement.mqtt.MqttPublisher;
import com.cinema.seatmanagement.model.enums.UserRole;
import com.cinema.seatmanagement.view.dto.request.RegisterRequest;
import com.cinema.seatmanagement.view.dto.request.SeatStateUpdateRequest;
import com.cinema.seatmanagement.view.dto.response.*;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import com.cinema.seatmanagement.view.dto.request.ShowtimeRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * AdminController — privileged operations for ADMIN and MANAGER roles.
 *
 * NEW ENDPOINTS:
 *
 *   GET  /api/admin/tracking/{showtimeId}/snapshot
 *        Returns a list of bookings currently in CHECKED_IN state (i.e. customers
 *        who scanned at the door but haven't reached their seat yet). The staff
 *        tracking display uses this as the initial HTTP load before subscribing
 *        to the WebSocket topic for live updates.
 *
 *   POST /api/admin/screens/{screenId}/resync-leds
 *        Iterates every seat in the screen, reads its current state from the DB,
 *        and publishes the corresponding MQTT SET_LED command. Used after an ESP32
 *        reboot or WiFi drop — the ESP32 loses its LED state on restart.
 */
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
    private final SeatRepository seatRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final BookingRepository bookingRepository;
    private final MqttPublisher mqttPublisher;

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
    public ResponseEntity<ShowtimeResponse> createShowtime(@RequestBody ShowtimeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(showtimeService.createShowtime(request));
    }

    @PutMapping("/showtimes/{id}")
    public ResponseEntity<ShowtimeResponse> updateShowtime(
            @PathVariable Long id, @RequestBody ShowtimeRequest request) {
        return ResponseEntity.ok(showtimeService.updateShowtime(id, request));
    }

    @DeleteMapping("/showtimes/{id}")
    public ResponseEntity<Void> cancelShowtime(@PathVariable Long id) {
        showtimeService.cancelShowtime(id);
        return ResponseEntity.noContent().build();
    }

    // ── Seat State Override ───────────────────────────────────────────────────

    @PatchMapping("/seats/{seatId}/state")
    public ResponseEntity<Void> updateSeatState(
            @PathVariable Long seatId,
            @Valid @RequestBody SeatStateUpdateRequest request
    ) {
        seatService.updateSeatState(seatId, request.getShowtimeId(), request.getNewState(), null);
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

    // ── Live Tracking ─────────────────────────────────────────────────────────

    /**
     * GET /api/admin/tracking/{showtimeId}/snapshot
     *
     * Returns all bookings in CHECKED_IN status for a given showtime.
     * These are customers who have passed the entrance door but whose seat
     * arrival hasn't been confirmed yet (seat state = GUIDING).
     *
     * This endpoint provides the INITIAL STATE for the LiveTrackingPage.
     * After loading this snapshot, the page subscribes to:
     *   WebSocket /topic/tracking/{showtimeId}
     * to receive real-time DOOR_SCANNED and SEATED events.
     */
    @GetMapping("/tracking/{showtimeId}/snapshot")
    public ResponseEntity<List<BookingResponse>> getCheckedInSnapshot(
            @PathVariable Long showtimeId
    ) {
        List<BookingResponse> checkedIn = bookingService
                .getBookingsByShowtime(showtimeId)
                .stream()
                .filter(b -> "CHECKED_IN".equals(b.getStatus())
                        || "COMPLETED".equals(b.getStatus()))
                .toList();
        return ResponseEntity.ok(checkedIn);
    }

    // ── IoT LED Resync ────────────────────────────────────────────────────────

    /**
     * POST /api/admin/screens/{screenId}/resync-leds
     *
     * Republishes MQTT SET_LED commands for every seat in the screen, based
     * on the current seat_state in the database.
     *
     * USE CASE: The ESP32 reboots or loses WiFi and forgets all LED states.
     * The admin clicks "Resync LEDs" in the dashboard, and this endpoint
     * restores the correct pattern for all 6 (or N) LEDs instantly.
     *
     * The method requires a showtimeId to know which seat_state records to read.
     */
    @PostMapping("/screens/{screenId}/resync-leds")
    public ResponseEntity<Map<String, Object>> resyncLeds(
            @PathVariable Long screenId,
            @RequestParam Long showtimeId
    ) {
        Screen screen = screenRepository.findById(screenId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Screen not found with id: " + screenId));

        List<Seat> seats = seatRepository
                .findByScreenIdOrderByRowLabelAscColNumberAsc(screenId);

        int synced = 0;
        for (Seat seat : seats) {
            if (seat.getLedIndex() == null || !seat.getIsActive()) continue;

            // Find current state for this seat in the given showtime
            SeatState currentState = bookingSeatRepository
                    .findBySeatAndShowtimeForUpdate(seat.getId(), showtimeId)
                    .map(bs -> bs.getSeatState())
                    .orElse(SeatState.AVAILABLE);

            mqttPublisher.resyncLed(screenId, seat.getLedIndex(), currentState);
            synced++;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("screenId",   screenId);
        result.put("screenName", screen.getName());
        result.put("synced",     synced);
        result.put("message",    "Resync commands sent for " + synced + " LEDs");

        return ResponseEntity.ok(result);
    }

    // ── Staff Management ──────────────────────────────────────────────────────

    @PostMapping("/staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponse> registerStaff(
            @Valid @RequestBody RegisterRequest request,
            @RequestParam String role,
            @RequestParam Long cinemaId
    ) {
        AuthResponse response = authService.registerStaff(request, UserRole.valueOf(role.toUpperCase()), cinemaId);
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

    @PutMapping("/staff/{userId}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> updateStaffRole(
            @PathVariable Long userId,
            @RequestParam String role) {
        return ResponseEntity.ok(userService.updateRole(userId, role));
    }

    @DeleteMapping("/staff/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivateStaff(@PathVariable Long userId) {
        userService.deactivateUser(userId);
        return ResponseEntity.noContent().build();
    }

    // ── Kiosk Management ──────────────────────────────────────────────────────

    @PostMapping("/kiosks")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> registerKiosk(
            @RequestParam Long screenId,
            @RequestParam(required = false) String name
    ) {
        Screen screen = screenRepository.findById(screenId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Screen not found with id: " + screenId));

        String apiKey = "KIOSK-" + UUID.randomUUID();

        Kiosk kiosk = Kiosk.builder()
                .screen(screen)
                .apiKey(apiKey)
                .name(name != null ? name : "Kiosk-" + screenId)
                .isActive(true)
                .build();
        kiosk = kioskRepository.save(kiosk);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("kioskId",  kiosk.getId());
        response.put("screenId", screenId);
        response.put("apiKey",   apiKey);
        response.put("name",     kiosk.getName());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/kiosks")
    public ResponseEntity<List<Map<String, Object>>> getAllKiosks() {
        return ResponseEntity.ok(
                kioskRepository.findAll().stream().map(k -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id",       k.getId());
                    m.put("name",     k.getName());
                    m.put("screenId", k.getScreen().getId());
                    m.put("screen",   k.getScreen().getName());
                    m.put("isActive", k.getIsActive());
                    m.put("apiKey",   k.getApiKey());
                    m.put("lastSeen", k.getLastSeenAt() != null ? k.getLastSeenAt().toString() : null);
                    return m;
                }).toList()
        );
    }
}