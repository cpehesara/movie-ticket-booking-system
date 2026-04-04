package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.service.interfaces.SeatArrivalService;
import com.cinema.seatmanagement.view.dto.request.QrScanRequest;
import com.cinema.seatmanagement.view.dto.response.SeatArrivalResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * SeatArrivalController — /api/seat-arrival/**
 *
 * Secured by JWT (standard customer authentication).
 * Called from the customer's mobile/web portal when they scan the
 * permanent QR code affixed to their physical seat.
 *
 * Flow:
 *   Customer opens portal → My Bookings → uses device camera to scan the
 *   permanent QR sticker on their seat → POST to /api/seat-arrival/scan
 *   with the decoded payload + their JWT token.
 *
 * SecurityConfig: /api/seat-arrival/** is permitAll() so KioskApiKeyFilter
 * passes through, but actual auth is enforced by @PreAuthorize or Authentication
 * parameter check below. JWT filter runs first and populates SecurityContext.
 *
 * Note: The principal is the userId (Long) set by JwtAuthenticationFilter.
 */
@RestController
@RequestMapping("/api/seat-arrival")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Seat Arrival", description = "Permanent seat QR scan — confirms seating and turns off LED")
public class SeatArrivalController {

    private final SeatArrivalService seatArrivalService;

    /**
     * POST /api/seat-arrival/scan
     *
     * Body: { "qrPayload": "SEAT:3:1:A:3:abcHMAC..." }
     * Header: Authorization: Bearer {jwt}
     *
     * Called by: customer mobile/web portal (JWT auth)
     * On success: seat → OCCUPIED, LED turns OFF, WS broadcast
     */
    @PostMapping("/scan")
    @Operation(
            summary = "Scan permanent seat QR to confirm seating",
            description = "Customer scans the QR sticker on their seat. LED turns off on success.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<SeatArrivalResponse> scanSeatQr(
            @Valid @RequestBody QrScanRequest request,
            Authentication authentication
    ) {
        // JwtAuthenticationFilter sets principal = userId (Long)
        Long userId = (Long) authentication.getPrincipal();

        log.info("[SeatArrival] QR scan from user={} payload={}...",
                userId,
                request.getQrPayload().substring(0, Math.min(20, request.getQrPayload().length())));

        SeatArrivalResponse response = seatArrivalService.processSeatArrival(
                request.getQrPayload(), userId);

        return ResponseEntity.ok(response);
    }
}