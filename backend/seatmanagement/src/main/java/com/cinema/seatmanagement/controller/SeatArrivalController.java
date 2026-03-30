package com.cinema.seatmanagement.controller;

import com.cinema.seatmanagement.model.service.interfaces.SeatArrivalService;
import com.cinema.seatmanagement.view.dto.request.SeatArrivalRequest;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/seat-arrival")
@RequiredArgsConstructor
public class SeatArrivalController {

    private final SeatArrivalService seatArrivalService;

    /**
     * Second scan in the two-scan demo flow.
     *
     * Called by the kiosk when the customer scans the physical QR label
     * stuck on their assigned seat. Triggers the CONFIRM LED effect on
     * the ESP32 and marks the booking COMPLETED.
     *
     * This endpoint is permitAll — same as /api/checkin — because kiosks
     * authenticate via API key (X-API-Key header), not JWT.
     */
    @PostMapping
    public ResponseEntity<BookingResponse> confirmSeatArrival(
            @Valid @RequestBody SeatArrivalRequest request
    ) {
        BookingResponse response = seatArrivalService.confirmSeatArrival(request);
        return ResponseEntity.ok(response);
    }
}