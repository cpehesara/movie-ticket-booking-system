package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.entity.Seat;
import com.cinema.seatmanagement.model.repository.SeatRepository;
import com.cinema.seatmanagement.model.service.interfaces.QrCodeService;
import com.cinema.seatmanagement.model.service.interfaces.SeatService;
import com.cinema.seatmanagement.mqtt.MqttPublisher;
import com.cinema.seatmanagement.mqtt.MqttPublisherStub;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * SeatAdminController — /api/admin/seats/**
 *
 * CHANGES FROM ORIGINAL:
 *  + POST /api/admin/seats/{seatId}/qr         — generate/regenerate permanent seat QR
 *  + POST /api/admin/seats/screen/{screenId}/generate-all-qr — bulk generate QRs for all seats
 *  + POST /api/admin/seats/resync-leds/{showtimeId}          — resync ESP32 LEDs
 *
 * All endpoints require ADMIN or MANAGER role.
 */
@RestController
@RequestMapping("/api/admin/seats")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Admin - Seats", description = "Seat management, QR generation, LED resync")
public class SeatAdminController {

    private final SeatRepository seatRepository;
    private final SeatService    seatService;
    private final QrCodeService  qrCodeService;

    /**
     * POST /api/admin/seats/{seatId}/qr
     *
     * Generates (or regenerates) the permanent QR code for a physical seat.
     * Stores both payload and Base64 PNG image in the Seat entity.
     *
     * Call this once per seat after the cinema is set up, then print the
     * returned Base64 image and affix it to the physical seat.
     */
    @PostMapping("/{seatId}/qr")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "Generate permanent QR code for a physical seat")
    public ResponseEntity<Map<String, Object>> generateSeatQr(@PathVariable Long seatId) {

        Seat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new EntityNotFoundException("Seat not found: " + seatId));

        String payload = qrCodeService.buildSeatQrPayload(
                seat.getId(), seat.getScreen().getId(),
                seat.getRowLabel(), seat.getColNumber());

        String image = qrCodeService.generateSeatQrCode(
                seat.getId(), seat.getScreen().getId(),
                seat.getRowLabel(), seat.getColNumber());

        seat.setPermanentQrPayload(payload);
        seat.setPermanentQrImage(image);
        seatRepository.save(seat);

        log.info("[Admin] Permanent QR generated for seat={} id={}", seat.getLabel(), seatId);

        return ResponseEntity.ok(Map.of(
                "seatId",    seatId,
                "seatLabel", seat.getLabel(),
                "payload",   payload,
                "imageBase64", image,
                "printUrl",  "data:image/png;base64," + image
        ));
    }

    /**
     * POST /api/admin/seats/screen/{screenId}/generate-all-qr
     *
     * Bulk-generates permanent QR codes for ALL active seats in a screen.
     * Returns list of seat labels with their payloads.
     * (Images are stored in DB; admin can retrieve per-seat via GET /api/admin/seats/{id})
     */
    @PostMapping("/screen/{screenId}/generate-all-qr")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "Bulk generate permanent QR codes for all seats in a screen")
    public ResponseEntity<List<Map<String, Object>>> generateAllSeatQrs(
            @PathVariable Long screenId) {

        List<Seat> seats = seatRepository
                .findByScreenIdAndIsActiveTrueOrderByRowLabelAscColNumberAsc(screenId);

        if (seats.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<Map<String, Object>> results = seats.stream().map(seat -> {
            String payload = qrCodeService.buildSeatQrPayload(
                    seat.getId(), screenId, seat.getRowLabel(), seat.getColNumber());
            String image = qrCodeService.generateSeatQrCode(
                    seat.getId(), screenId, seat.getRowLabel(), seat.getColNumber());

            seat.setPermanentQrPayload(payload);
            seat.setPermanentQrImage(image);
            seatRepository.save(seat);

            return Map.<String, Object>of(
                    "seatId",    seat.getId(),
                    "seatLabel", seat.getLabel(),
                    "ledIndex",  seat.getLedIndex() != null ? seat.getLedIndex() : -1,
                    "payload",   payload
            );
        }).collect(Collectors.toList());

        log.info("[Admin] Bulk QR generated for {} seats on screenId={}", results.size(), screenId);
        return ResponseEntity.ok(results);
    }

    /**
     * POST /api/admin/seats/resync-leds/{showtimeId}
     *
     * Re-sends MQTT LED commands for all booked seats in a showtime.
     * Use this when the ESP32 reconnects after a power cycle or network drop.
     */
    @PostMapping("/resync-leds/{showtimeId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "Resync ESP32 LEDs for a showtime (use after IoT reconnect)")
    public ResponseEntity<Map<String, String>> resyncLeds(@PathVariable Long showtimeId) {
        seatService.resyncLedsForShowtime(showtimeId);
        return ResponseEntity.ok(Map.of(
                "status",  "ok",
                "message", "LED resync commands published for showtimeId=" + showtimeId
        ));
    }

    /**
     * GET /api/admin/seats/{seatId}
     *
     * Returns seat details including permanent QR image (for printing).
     */
    @GetMapping("/{seatId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Operation(summary = "Get seat details including permanent QR")
    public ResponseEntity<Map<String, Object>> getSeat(@PathVariable Long seatId) {
        Seat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new EntityNotFoundException("Seat not found: " + seatId));

        return ResponseEntity.ok(Map.of(
                "seatId",        seat.getId(),
                "seatLabel",     seat.getLabel(),
                "seatType",      seat.getSeatType().name(),
                "ledIndex",      seat.getLedIndex() != null ? seat.getLedIndex() : -1,
                "isActive",      seat.getIsActive(),
                "hasQr",         seat.getPermanentQrPayload() != null,
                "qrPayload",     seat.getPermanentQrPayload() != null ? seat.getPermanentQrPayload() : "",
                "qrImageBase64", seat.getPermanentQrImage() != null ? seat.getPermanentQrImage() : ""
        ));
    }
}