// ============================================================
// FILE 1: QrScanRequest.java
// ============================================================
package com.cinema.seatmanagement.view.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Generic QR scan request body.
 * Used by both CheckInController (door scan) and SeatArrivalController (seat scan).
 *
 * The kiosk/customer portal decodes the QR image to get the raw text payload,
 * then sends just that string here — NOT the Base64 image.
 */
@Data
public class QrScanRequest {

    @NotBlank(message = "QR payload must not be blank")
    private String qrPayload;
}