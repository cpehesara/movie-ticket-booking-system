package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.exception.BookingExpiredException;
import com.cinema.seatmanagement.model.entity.Booking;
import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.model.enums.BookingStatus;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.repository.BookingRepository;
import com.cinema.seatmanagement.model.service.interfaces.CheckinService;
import com.cinema.seatmanagement.mqtt.MqttPublisher;
import com.cinema.seatmanagement.view.dto.request.CheckinRequest;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;
import com.cinema.seatmanagement.view.mapper.BookingMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * CheckinServiceImpl — handles STEP 1 of the IoT two-scan flow.
 *
 * IoT Flow:
 *   Step 1 (Door scan) → this service
 *     • Booking status CONFIRMED → CHECKED_IN
 *     • Seat states remain BOOKED (customer not yet physically seated)
 *     • MQTT: sends WHITE_PULSE to LED (guides customer to their seat)
 *     • WebSocket: broadcasts CUSTOMER_WALKING event (staff UI highlights seat)
 *
 *   Step 2 (Seat QR scan) → SeatArrivalService
 *     • Seat states BOOKED → OCCUPIED
 *     • MQTT: sends OFF command (LED extinguishes — customer seated ✓)
 *     • WebSocket: broadcasts CUSTOMER_SEATED event
 *
 * Design Pattern — Template Method: This class is a step in the notification
 * template defined by AbstractEmailNotificationService hierarchy.
 */
@Service
@RequiredArgsConstructor
public class CheckinServiceImpl implements CheckinService {

    private final BookingRepository bookingRepository;
    private final BookingMapper bookingMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final MqttPublisher mqttPublisher;

    /**
     * STEP 1 — Door scan. Validates the booking QR and activates LED guidance.
     * Seats remain BOOKED; they transition to OCCUPIED only when the customer
     * physically arrives at the seat (SeatArrivalService).
     */
    @Override
    @Transactional
    public BookingResponse checkin(CheckinRequest request) {
        Booking booking = bookingRepository.findByBookingCode(request.getBookingCode())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Booking not found with code: " + request.getBookingCode()));

        if (booking.getStatus() == BookingStatus.CHECKED_IN) {
            // Already checked in — return current state (idempotent)
            return bookingMapper.toResponse(booking);
        }

        if (booking.getStatus() == BookingStatus.CANCELLED
                || booking.getStatus() == BookingStatus.EXPIRED) {
            throw new BookingExpiredException(
                    "Booking has been " + booking.getStatus().name().toLowerCase());
        }

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalStateException(
                    "Booking must be CONFIRMED before check-in. Current status: "
                            + booking.getStatus());
        }

        // ── Mark booking as CHECKED_IN ──────────────────────────────────────
        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setCheckedInAt(LocalDateTime.now());
        bookingRepository.save(booking);

        Long showtimeId = booking.getShowtime().getId();

        // ── For each seat: keep BOOKED state, activate guiding LED ──────────
        for (BookingSeat bs : booking.getBookingSeats()) {
            // Seat state stays BOOKED — customer is walking, not yet confirmed seated
            // LED: WHITE_PULSE via MQTT (guides customer through the dark hall)
            if (bs.getSeat().getLedIndex() != null) {
                mqttPublisher.publishGuidingCommand(
                        bs.getSeat().getScreen().getId(),
                        bs.getSeat().getLedIndex()
                );
            }

            // WebSocket: broadcast CUSTOMER_WALKING event so staff dashboard
            // highlights the seat with animation
            broadcastWalkingEvent(showtimeId, bs.getSeat().getId());
        }

        return bookingMapper.toResponse(booking);
    }

    /**
     * Broadcasts a CUSTOMER_WALKING event over WebSocket.
     * The staff IoT dashboard subscribes to /topic/seats/{showtimeId}
     * and animates the seat when eventType=CUSTOMER_WALKING is received.
     */
    private void broadcastWalkingEvent(Long showtimeId, Long seatId) {
        Map<String, Object> event = new HashMap<>();
        event.put("seatId", seatId);
        event.put("showtimeId", showtimeId);
        event.put("seatState", SeatState.BOOKED.name());          // state unchanged
        event.put("eventType", "CUSTOMER_WALKING");               // staff UI key
        event.put("timestamp", LocalDateTime.now().toString());

        messagingTemplate.convertAndSend("/topic/seats/" + showtimeId, (Object) event);
    }
}