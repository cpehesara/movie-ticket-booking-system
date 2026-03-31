package com.cinema.seatmanagement.model.service.interfaces;

import com.cinema.seatmanagement.view.dto.request.SeatArrivalRequest;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;

/**
 * SeatArrivalService — Step 2 of the IoT two-scan check-in flow.
 *
 * When a customer reaches their seat and scans the physical seat QR code,
 * this service:
 *   1. Parses the seat ID from the QR data.
 *   2. Validates the seat belongs to the customer's booking.
 *   3. Transitions the seat state BOOKED → OCCUPIED.
 *   4. Sends MQTT OFF command (LED extinguishes — customer confirmed seated).
 *   5. Broadcasts CUSTOMER_SEATED WebSocket event for the staff dashboard.
 *
 * If ALL seats in the booking are now OCCUPIED, the booking status
 * transitions to COMPLETED.
 */
public interface SeatArrivalService {

    /**
     * Confirms a customer has arrived at their seat.
     *
     * @param request contains bookingCode + seat QR data
     * @return updated BookingResponse
     * @throws jakarta.persistence.EntityNotFoundException if booking or seat not found
     * @throws IllegalStateException if seat does not belong to this booking
     */
    BookingResponse confirmSeatArrival(SeatArrivalRequest request);
}