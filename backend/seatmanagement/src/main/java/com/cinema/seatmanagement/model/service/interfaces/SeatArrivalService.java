package com.cinema.seatmanagement.model.service.interfaces;

import com.cinema.seatmanagement.view.dto.request.SeatArrivalRequest;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;

public interface SeatArrivalService {

    /**
     * Called when a customer scans the physical QR label on their specific seat.
     *
     * Flow:
     *   1. Validates booking is CHECKED_IN (door scan already happened)
     *   2. Verifies the scanned seat belongs to this booking
     *   3. Publishes MQTT CONFIRM command → LED solid ON for 3s then OFF
     *   4. If ALL seats in the booking are confirmed → sets booking COMPLETED
     *
     * This is the second scan in the two-scan demo flow.
     */
    BookingResponse confirmSeatArrival(SeatArrivalRequest request);
}