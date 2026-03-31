package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.service.interfaces.SeatArrivalService;
import com.cinema.seatmanagement.view.dto.request.SeatArrivalRequest;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * SeatArrivalController — STEP 2 of the IoT two-scan check-in flow.
 *
 * Endpoint: POST /api/seat-arrival
 *
 * Called by the kiosk (or seat-side scanner) when the customer scans
 * the physical QR code attached to their cinema seat. This is the final
 * confirmation that the customer is correctly seated.
 *
 * IoT result:
 *   LED turns OFF → customer confirmed at correct seat ✓
 *   Staff UI stops the walking animation for that seat.
 *
 * Authentication: Kiosk API Key (X-API-Key header)
 * The endpoint is open to both kiosk API key holders and authenticated users.
 */
@RestController
@RequestMapping("/api/seat-arrival")
@RequiredArgsConstructor
public class SeatArrivalController {

    private final SeatArrivalService seatArrivalService;

    /**
     * Confirm customer has arrived at their seat.
     *
     * Request body:
     * {
     *   "bookingCode": "BK-XXXXXXXX",   // from door QR scan (Step 1)
     *   "seatQrData":  "SEAT-14"        // from physical seat QR
     * }
     *
     * Response: Updated BookingResponse with COMPLETED status if all seats confirmed.
     */
    @PostMapping
    public ResponseEntity<BookingResponse> confirmSeatArrival(
            @Valid @RequestBody SeatArrivalRequest request
    ) {
        BookingResponse response = seatArrivalService.confirmSeatArrival(request);
        return ResponseEntity.ok(response);
    }
}