package com.cinema.seatmanagement.view.dto.response;

import lombok.Builder;
import lombok.Data;

/**
 * Response returned after a customer scans the permanent seat QR.
 *
 * success=true  → seat confirmed, LED turned off, enjoy the movie
 * success=false → wrong seat / no active booking / show not started
 */
@Data
@Builder
public class SeatArrivalResponse {

    private boolean success;
    private String  message;

    private String seatLabel;     // e.g. "A-3"
    private String movieTitle;
    private String startTime;
    private String seatedAt;      // ISO-8601 timestamp when seating confirmed
}