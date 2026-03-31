package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.model.entity.Booking;
import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.model.enums.BookingStatus;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.repository.BookingRepository;
import com.cinema.seatmanagement.model.repository.BookingSeatRepository;
import com.cinema.seatmanagement.model.service.interfaces.SeatArrivalService;
import com.cinema.seatmanagement.mqtt.MqttPublisher;
import com.cinema.seatmanagement.view.dto.request.SeatArrivalRequest;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;
import com.cinema.seatmanagement.view.mapper.BookingMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * SeatArrivalServiceImpl — STEP 2 of the IoT two-scan flow.
 *
 * The customer scans the QR code physically attached to their seat.
 * This service:
 *   1. Parses seatId from QR data (format: "SEAT-{seatId}" or just "{seatId}")
 *   2. Verifies the seat belongs to this booking (security check)
 *   3. Transitions BookingSeat state: BOOKED → OCCUPIED
 *   4. MQTT: publishes OFF command → LED extinguishes (customer confirmed seated ✓)
 *   5. WebSocket: broadcasts CUSTOMER_SEATED event (staff dashboard clears animation)
 *   6. If all seats confirmed → booking CHECKED_IN → COMPLETED
 *
 * Design Patterns:
 *   - State Pattern: BOOKED → OCCUPIED transition validated here
 *   - Observer Pattern: WebSocket broadcast notifies all subscribers
 *   - Adapter Pattern: MqttPayloadAdapter translates QR string to seat entity
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SeatArrivalServiceImpl implements SeatArrivalService {

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final BookingMapper bookingMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final MqttPublisher mqttPublisher;

    @Override
    @Transactional
    public BookingResponse confirmSeatArrival(SeatArrivalRequest request) {

        // ── 1. Find booking ───────────────────────────────────────────────
        Booking booking = bookingRepository.findByBookingCode(request.getBookingCode())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Booking not found with code: " + request.getBookingCode()));

        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalStateException(
                    "Customer must scan door QR first. Current status: " + booking.getStatus());
        }

        // ── 2. Parse seat ID from QR data ────────────────────────────────
        //    Supported formats: "SEAT-14", "SEAT-14-SCREEN-1", or just "14"
        Long targetSeatId = parseSeatId(request.getSeatQrData());

        // ── 3. Verify seat belongs to this booking ───────────────────────
        BookingSeat targetBookingSeat = booking.getBookingSeats().stream()
                .filter(bs -> bs.getSeat().getId().equals(targetSeatId))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Seat " + request.getSeatQrData()
                                + " does not belong to booking " + request.getBookingCode()
                                + ". Please check your seat assignment."));

        if (targetBookingSeat.getSeatState() == SeatState.OCCUPIED) {
            // Idempotent — customer scanned twice, just return current state
            log.info("Seat {} already confirmed occupied for booking {}",
                    targetSeatId, request.getBookingCode());
            return bookingMapper.toResponse(booking);
        }

        // ── 4. Transition: BOOKED → OCCUPIED ────────────────────────────
        targetBookingSeat.setSeatState(SeatState.OCCUPIED);
        bookingSeatRepository.save(targetBookingSeat);
        log.info("Seat {} confirmed occupied for booking {}",
                targetSeatId, request.getBookingCode());

        // ── 5. MQTT: extinguish LED (customer is seated ✓) ───────────────
        if (targetBookingSeat.getSeat().getLedIndex() != null) {
            mqttPublisher.publishSeatCommand(
                    targetBookingSeat.getSeat().getScreen().getId(),
                    targetBookingSeat.getSeat().getLedIndex(),
                    SeatState.OCCUPIED          // mapped to "OFF" in publisher
            );
        }

        // ── 6. WebSocket: CUSTOMER_SEATED event ──────────────────────────
        Long showtimeId = booking.getShowtime().getId();
        broadcastSeatedEvent(showtimeId, targetSeatId);

        // ── 7. Check if ALL seats in this booking are now OCCUPIED ────────
        boolean allSeated = booking.getBookingSeats().stream()
                .allMatch(bs -> bs.getSeatState() == SeatState.OCCUPIED
                        || bs.getId().equals(targetBookingSeat.getId()));

        if (allSeated) {
            booking.setStatus(BookingStatus.COMPLETED);
            bookingRepository.save(booking);
            log.info("Booking {} fully completed — all seats occupied", request.getBookingCode());
        }

        return bookingMapper.toResponse(booking);
    }

    /**
     * Parses the seat ID from QR data.
     * Accepted formats:
     *   "SEAT-14"          → 14
     *   "SEAT-14-SCREEN-1" → 14
     *   "14"               → 14
     */
    private Long parseSeatId(String qrData) {
        try {
            String normalized = qrData.trim().toUpperCase();
            if (normalized.startsWith("SEAT-")) {
                // "SEAT-14" or "SEAT-14-SCREEN-1"
                String[] parts = normalized.split("-");
                return Long.parseLong(parts[1]);
            }
            return Long.parseLong(normalized);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(
                    "Invalid seat QR format: '" + qrData
                            + "'. Expected format: SEAT-{id} or just {id}");
        }
    }

    /**
     * Broadcasts CUSTOMER_SEATED event so the staff IoT dashboard can
     * stop the walking animation and show the seat as confirmed.
     */
    private void broadcastSeatedEvent(Long showtimeId, Long seatId) {
        Map<String, Object> event = new HashMap<>();
        event.put("seatId", seatId);
        event.put("showtimeId", showtimeId);
        event.put("seatState", SeatState.OCCUPIED.name());
        event.put("eventType", "CUSTOMER_SEATED");
        event.put("timestamp", LocalDateTime.now().toString());

        messagingTemplate.convertAndSend("/topic/seats/" + showtimeId, (Object) event);
    }
}