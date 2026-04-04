package com.cinema.seatmanagement.model.service.interfaces;

import com.cinema.seatmanagement.view.dto.response.CheckInResponse;

/**
 * CheckInService — handles Step 7/8 of the IoT flow:
 *
 * Customer stands at the cinema door, opens their "My Bookings" page,
 * taps a booking QR → the door scanner reads the QR and POSTs the payload
 * to /api/checkin/scan.
 *
 * On success:
 *   1. Booking status → CONFIRMED (was PENDING/CONFIRMED already from payment)
 *   2. Booking.checkedInAt is set
 *   3. All booked seats for this booking transition: BOOKED → GUIDING
 *   4. LED(s) for those seats turn ON (MQTT command published)
 *   5. WebSocket broadcast → staff hall display shows customer entered
 *   6. Check-in confirmation email sent async
 *
 * GUIDING state = LED is ON, customer is walking to their seat.
 * The door does NOT need to be physically controlled in this phase.
 */
public interface CheckInService {

    /**
     * Process a booking QR scan at the cinema door.
     *
     * @param rawQrPayload  the raw string decoded from the QR (not Base64 image)
     * @param kioskScreenId the screenId of the kiosk that performed the scan
     *                      (validated by KioskApiKeyFilter; set as request attribute)
     * @return CheckInResponse with booking details + seat labels + LED status
     */
    CheckInResponse processCheckin(String rawQrPayload, Long kioskScreenId);
}