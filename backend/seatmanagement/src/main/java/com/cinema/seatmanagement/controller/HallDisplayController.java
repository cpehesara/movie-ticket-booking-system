package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.model.entity.Showtime;
import com.cinema.seatmanagement.model.enums.ShowtimeStatus;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.repository.BookingSeatRepository;
import com.cinema.seatmanagement.model.repository.ShowtimeRepository;
import com.cinema.seatmanagement.websocket.SeatWebSocketHandler;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * HallDisplayController — /api/hall-display/**
 *
 * Powers the staff-facing live hall display screen.
 * Shows real-time seating status for the current IN_PROGRESS showtime.
 *
 * Authentication: ADMIN or MANAGER role (JWT).
 *
 * Real-time updates arrive via WebSocket /topic/seats/{showtimeId}
 * and /topic/admin/alerts — the frontend subscribes to both.
 * This REST endpoint provides the initial snapshot on page load.
 *
 * The display shows:
 *   - Each seat with its current state (AVAILABLE/BOOKED/GUIDING/OCCUPIED)
 *   - LED indicator state (ON=GUIDING, BLINK=waiting, OFF=OCCUPIED/AVAILABLE)
 *   - Customer name for GUIDING/OCCUPIED seats
 *   - Live event feed (customer entered, customer seated)
 *   - Counts: total / booked / guiding / occupied / available
 */
@RestController
@RequestMapping("/api/hall-display")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Hall Display", description = "Staff live seating monitor — IoT LED + customer tracking")
public class HallDisplayController {

    private final ShowtimeRepository     showtimeRepository;
    private final BookingSeatRepository  bookingSeatRepository;
    private final SeatWebSocketHandler   seatWebSocketHandler;

    /**
     * GET /api/hall-display/showtime/{showtimeId}
     *
     * Returns a full snapshot of all seats for a showtime:
     * seat label, state, customer name (if booked), LED index, LED state.
     *
     * The frontend calls this ONCE on load, then subscribes to WebSocket
     * /topic/seats/{showtimeId} for incremental updates.
     */
    @GetMapping("/showtime/{showtimeId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','OPERATOR')")
    @Operation(summary = "Get live hall snapshot for a showtime")
    public ResponseEntity<HallDisplaySnapshot> getHallSnapshot(
            @PathVariable Long showtimeId) {

        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Showtime not found: " + showtimeId));

        List<BookingSeat> bookingSeats = bookingSeatRepository.findByShowtimeId(showtimeId);

        List<SeatDisplayInfo> seatInfos = bookingSeats.stream()
                .map(bs -> SeatDisplayInfo.builder()
                        .seatId(bs.getSeat().getId())
                        .seatLabel(bs.getSeat().getLabel())
                        .rowLabel(bs.getSeat().getRowLabel())
                        .colNumber(bs.getSeat().getColNumber())
                        .ledIndex(bs.getSeat().getLedIndex())
                        .seatState(bs.getSeatState().name())
                        .ledState(toLedState(bs.getSeatState()))
                        .customerName(bs.getBooking().getUser().getFullName())
                        .bookingCode(bs.getBooking().getBookingCode())
                        .build())
                .collect(Collectors.toList());

        // Counts
        Map<String, Long> counts = bookingSeats.stream()
                .collect(Collectors.groupingBy(
                        bs -> bs.getSeatState().name(),
                        Collectors.counting()));

        int viewerCount = seatWebSocketHandler.getSubscriberCount(showtimeId);

        HallDisplaySnapshot snapshot = HallDisplaySnapshot.builder()
                .showtimeId(showtimeId)
                .movieTitle(showtime.getMovie().getTitle())
                .screenName(showtime.getScreen().getName())
                .startTime(showtime.getStartTime().toString())
                .endTime(showtime.getEndTime().toString())
                .showtimeStatus(showtime.getStatus().name())
                .seats(seatInfos)
                .stateCounts(counts)
                .activeViewers(viewerCount)
                .snapshotAt(java.time.LocalDateTime.now().toString())
                .build();

        return ResponseEntity.ok(snapshot);
    }

    /**
     * GET /api/hall-display/screen/{screenId}/active
     *
     * Returns the currently active (IN_PROGRESS or SCHEDULED) showtime
     * for a screen. Staff can call this to discover which showtimeId to watch.
     */
    @GetMapping("/screen/{screenId}/active")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','OPERATOR')")
    @Operation(summary = "Find the active showtime for a screen")
    public ResponseEntity<Map<String, Object>> getActiveShowtime(
            @PathVariable Long screenId) {

        Optional<Showtime> active = showtimeRepository.findByScreenId(screenId)
                .stream()
                .filter(st -> st.getStatus() == ShowtimeStatus.IN_PROGRESS
                        || st.getStatus() == ShowtimeStatus.SCHEDULED)
                .min(Comparator.comparing(Showtime::getStartTime));

        if (active.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "found", false,
                    "message", "No active showtime for screen " + screenId));
        }

        Showtime st = active.get();
        return ResponseEntity.ok(Map.of(
                "found",        true,
                "showtimeId",   st.getId(),
                "movieTitle",   st.getMovie().getTitle(),
                "status",       st.getStatus().name(),
                "startTime",    st.getStartTime().toString()
        ));
    }

    /**
     * GET /api/hall-display/subscribers
     *
     * Returns live WebSocket subscriber counts per showtime.
     * Used by admin dashboard to see how many staff screens are connected.
     */
    @GetMapping("/subscribers")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "Get WebSocket subscriber counts per showtime")
    public ResponseEntity<Map<Long, Integer>> getSubscriberCounts() {
        return ResponseEntity.ok(seatWebSocketHandler.getAllSubscriberCounts());
    }

    // ── LED state helper ─────────────────────────────────────────────────────

    /**
     * Maps SeatState → physical LED behaviour string.
     * The ESP32/frontend uses this to decide the LED pattern.
     *
     *   GUIDING  → "BLINK"  (LED blinks to guide the customer to the seat)
     *   OCCUPIED → "OFF"    (customer is seated; LED off)
     *   BOOKED   → "OFF"    (paid but not yet at door; LED off)
     *   others   → "OFF"
     *
     * Note: after check-in, GUIDING = solid ON (not blink) until the
     * customer actually arrives. Blink starts if 3+ minutes pass without
     * seat confirmation (handled by a scheduled check in SeatServiceImpl,
     * or simply by checking stateUpdatedAt in the frontend display timer).
     * For simplicity, GUIDING = solid ON from backend perspective.
     */
    private String toLedState(SeatState state) {
        return switch (state) {
            case GUIDING  -> "ON";
            case OCCUPIED -> "OFF";
            default       -> "OFF";
        };
    }

    // ── Inner DTOs (kept local to avoid extra files) ─────────────────────────

    @lombok.Data
    @lombok.Builder
    public static class HallDisplaySnapshot {
        private Long   showtimeId;
        private String movieTitle;
        private String screenName;
        private String startTime;
        private String endTime;
        private String showtimeStatus;
        private List<SeatDisplayInfo>  seats;
        private Map<String, Long>      stateCounts;
        private int    activeViewers;
        private String snapshotAt;
    }

    @lombok.Data
    @lombok.Builder
    public static class SeatDisplayInfo {
        private Long    seatId;
        private String  seatLabel;    // "A-1"
        private String  rowLabel;     // "A"
        private Integer colNumber;    // 1
        private Integer ledIndex;     // 0-5 (null if no LED)
        private String  seatState;    // SeatState.name()
        private String  ledState;     // "ON" | "OFF" | "BLINK"
        private String  customerName; // null if AVAILABLE
        private String  bookingCode;  // null if AVAILABLE
    }
}