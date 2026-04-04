package com.cinema.seatmanagement.model.service.interfaces;

import com.cinema.seatmanagement.view.dto.response.SeatArrivalResponse;

/**
 * SeatArrivalService — handles Step 10/11 of the IoT flow:
 *
 * Customer reaches their seat, scans the permanent QR code affixed to
 * the seat via their mobile app portal.
 *
 * On success:
 *   1. Validate the SEAT QR payload (HMAC check)
 *   2. Find the BookingSeat for this seat + current showtime
 *   3. Verify the customer scanning owns this booking seat
 *   4. Transition: GUIDING → OCCUPIED
 *   5. Publish MQTT LED OFF for the seat's ledIndex
 *   6. If the customer scans the WRONG seat's QR → LED keeps blinking (GUIDING)
 *   7. WebSocket broadcast → hall display "Customer X is now seated at B-3"
 */
public interface SeatArrivalService {

    /**
     * Customer scans the permanent QR on their physical seat.
     *
     * @param rawSeatQrPayload the SEAT:... payload decoded from the physical seat QR
     * @param userId           the logged-in customer's ID (from JWT in the request)
     * @return SeatArrivalResponse with seat details + LED off confirmation
     */
    SeatArrivalResponse processSeatArrival(String rawSeatQrPayload, Long userId);
}