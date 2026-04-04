package com.cinema.seatmanagement.view.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

/**
 * SeatArrivalRequest — Step 2 of the two-scan IoT check-in flow.
 *
 * The customer scans the permanent QR label physically attached to their seat.
 * The frontend (useSeatArrival hook) sends this request with:
 *   - bookingCode:   the same code from their booking QR (e.g. "BK-A1B2C3D4")
 *   - seatQrContent: the raw string decoded from the seat QR label (e.g. "SEAT:7")
 *
 * The seatQrContent format "SEAT:{id}" is validated here via regex.
 * SeatArrivalServiceImpl will parse the integer id from this string.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeatArrivalRequest {

    @NotBlank(message = "Booking code is required")
    private String bookingCode;

    /**
     * Raw content decoded from the permanent seat QR label.
     * Must match the format "SEAT:{positive integer}" — e.g. "SEAT:42".
     * The SeatArrivalServiceImpl strips the "SEAT:" prefix and uses the integer
     * to verify the seat belongs to this booking.
     */
    @NotBlank(message = "Seat QR content is required")
    @Pattern(
            regexp = "^SEAT:\\d+$",
            message = "Invalid seat QR format. Expected: SEAT:{seatId}"
    )
    private String seatQrContent;
}