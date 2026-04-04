package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.service.interfaces.CheckInService;
import com.cinema.seatmanagement.view.dto.request.QrScanRequest;
import com.cinema.seatmanagement.view.dto.response.CheckInResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * CheckInController — /api/checkin/**
 *
 * Secured by KioskApiKeyFilter (X-API-Key header), NOT JWT.
 * This endpoint is called by the door-side kiosk application.
 *
 * The kiosk reads a QR code, decodes the raw payload string, and POSTs it here.
 * KioskApiKeyFilter validates the API key and sets the "kioskScreenId" request attribute.
 *
 * SecurityConfig permits /api/checkin/** — KioskApiKeyFilter handles auth.
 */
@RestController
@RequestMapping("/api/checkin")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Check-In", description = "Door QR scan — booking verification and LED guide activation")
public class CheckInController {

    private final CheckInService checkInService;

    /**
     * POST /api/checkin/scan
     *
     * Body: { "qrPayload": "BOOKING:BK-20260401-X7K2:12:5:abcHMAC..." }
     *
     * Called by: door kiosk (X-API-Key auth)
     * On success: seats → GUIDING, LEDs turn ON, WS broadcast to hall display
     */
    @PostMapping("/scan")
    @Operation(summary = "Scan booking QR at door",
            description = "Validates QR, marks booking as checked-in, activates LED guide")
    public ResponseEntity<CheckInResponse> scanBookingQr(
            @Valid @RequestBody QrScanRequest request,
            HttpServletRequest httpRequest
    ) {
        // KioskApiKeyFilter sets this attribute after validating X-API-Key
        Long kioskScreenId = (Long) httpRequest.getAttribute("kioskScreenId");

        log.info("[CheckIn] QR scan received | screenId={} payload={}...",
                kioskScreenId,
                request.getQrPayload().substring(0, Math.min(20, request.getQrPayload().length())));

        CheckInResponse response = checkInService.processCheckin(request.getQrPayload(), kioskScreenId);
        return ResponseEntity.ok(response);
    }
}