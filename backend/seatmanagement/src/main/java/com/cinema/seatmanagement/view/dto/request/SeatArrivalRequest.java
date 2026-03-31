package com.cinema.seatmanagement.view.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * SeatArrivalRequest — payload for Step 2 of the IoT two-scan check-in flow.
 *
 * The customer arrives at their seat and scans the QR code affixed to the seat.
 * The kiosk (or a dedicated seat scanner) sends:
 *   • bookingCode  — the booking QR they scanned at the door (Step 1)
 *   • seatQrData   — raw QR content from the physical seat (format: "SEAT-{seatId}")
 *
 * When validated, the LED for that seat is extinguished and the seat state
 * transitions from BOOKED → OCCUPIED.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeatArrivalRequest {

    @NotBlank(message = "Booking code is required")
    private String bookingCode;

    @NotBlank(message = "Seat QR data is required")
    private String seatQrData;    // e.g. "SEAT-14" or "SEAT-14-SCREEN-1"
}