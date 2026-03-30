package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.model.entity.Booking;
import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.model.entity.Seat;
import com.cinema.seatmanagement.model.enums.BookingStatus;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.repository.BookingRepository;
import com.cinema.seatmanagement.model.repository.BookingSeatRepository;
import com.cinema.seatmanagement.model.repository.SeatRepository;
import com.cinema.seatmanagement.model.service.interfaces.SeatArrivalService;
import com.cinema.seatmanagement.mqtt.MqttPublisher;
import com.cinema.seatmanagement.view.dto.request.SeatArrivalRequest;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;
import com.cinema.seatmanagement.view.mapper.BookingMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SeatArrivalServiceImpl implements SeatArrivalService {

    private final BookingRepository     bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatRepository        seatRepository;
    private final MqttPublisher         mqttPublisher;
    private final BookingMapper         bookingMapper;

    @Override
    @Transactional
    public BookingResponse confirmSeatArrival(SeatArrivalRequest request) {

        // Step 1 — Load the booking (entity graph: seats + showtime)
        Booking booking = bookingRepository.findWithDetailsByBookingCode(request.getBookingCode())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Booking not found with code: " + request.getBookingCode()));

        // Step 2 — Must be CHECKED_IN (door scan completed)
        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalStateException(
                    "Booking must be CHECKED_IN before confirming seat arrival. "
                            + "Current status: " + booking.getStatus()
                            + ". Please scan the booking QR at the entrance kiosk first.");
        }

        // Step 3 — Verify the scanned seat belongs to this booking
        Seat seat = seatRepository.findById(request.getSeatId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Seat not found with id: " + request.getSeatId()));

        boolean seatBelongsToBooking = booking.getBookingSeats().stream()
                .anyMatch(bs -> bs.getSeat().getId().equals(request.getSeatId()));

        if (!seatBelongsToBooking) {
            throw new IllegalArgumentException(
                    "Seat " + seat.getRowLabel() + "-" + seat.getColNumber()
                            + " does not belong to booking " + request.getBookingCode()
                            + ". Please scan the QR on your assigned seat.");
        }

        // Step 4 — Publish MQTT CONFIRM command to the ESP32
        // LED will flash solid ON for 3 seconds then auto-turn OFF.
        // This is the visual confirmation that the customer is at the right seat.
        if (seat.getLedIndex() != null) {
            Long screenId = seat.getScreen().getId();
            mqttPublisher.publishSeatCommand(screenId, seat.getLedIndex(), SeatState.CANCELLED);
            // CANCELLED maps to CONFIRM in the demo publisher — see MqttPublisher below
            log.info("[SeatArrival] CONFIRM signal sent: screenId={} ledIndex={} seat={}-{}",
                    screenId, seat.getLedIndex(), seat.getRowLabel(), seat.getColNumber());
        }

        // Step 5 — Check if ALL seats in this booking have been confirmed
        // For the demo, once the customer scans ANY of their seats,
        // we complete the booking (simplification for single-seat demos).
        // For multi-seat: remove this and require each seat to be scanned.
        booking.setStatus(BookingStatus.COMPLETED);
        bookingRepository.save(booking);

        log.info("[SeatArrival] Booking {} → COMPLETED. Customer seated at {}-{}",
                booking.getBookingCode(), seat.getRowLabel(), seat.getColNumber());

        return bookingMapper.toResponse(booking);
    }
}