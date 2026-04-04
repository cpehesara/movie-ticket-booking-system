package com.cinema.seatmanagement.view.dto.response;

import lombok.Builder;
import lombok.Data;
import java.util.List;

/**
 * Response returned after a successful (or failed) door QR scan.
 *
 * On success (success=true):
 *   - Display welcome message + seat labels on door kiosk screen
 *   - Staff hall display receives this via WebSocket
 *
 * On failure (success=false):
 *   - Display error message on door kiosk screen
 *   - Door remains closed
 */
@Data
@Builder
public class CheckInResponse {

    /** true = QR valid + check-in recorded. false = rejected. */
    private boolean success;

    /** Human-readable message for kiosk display */
    private String message;

    private String bookingCode;
    private String customerName;
    private String movieTitle;
    private String screenName;
    private String startTime;

    /** Seat labels: ["A-1", "A-2"] */
    private List<String> seatLabels;

    private String checkedInAt;
}