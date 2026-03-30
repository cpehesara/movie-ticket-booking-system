package com.cinema.seatmanagement.view.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeatArrivalRequest {

    /**
     * The booking code from the booking QR already scanned at the door.
     * Used to verify the customer's booking is in CHECKED_IN state.
     */
    @NotBlank(message = "Booking code is required")
    private String bookingCode;

    /**
     * The seat ID encoded in the physical QR label stuck on the seat.
     * QR content format: "SEAT:{seatId}" e.g. "SEAT:7"
     * The kiosk app strips the prefix before sending.
     */
    @NotNull(message = "Seat ID is required")
    private Long seatId;
}