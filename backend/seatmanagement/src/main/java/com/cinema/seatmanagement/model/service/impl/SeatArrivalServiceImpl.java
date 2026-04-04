package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.exception.InvalidQrCodeException;
import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.model.entity.Seat;
import com.cinema.seatmanagement.model.entity.Showtime;
import com.cinema.seatmanagement.model.enums.AuditAction;
import com.cinema.seatmanagement.model.enums.ShowtimeStatus;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.repository.BookingSeatRepository;
import com.cinema.seatmanagement.model.repository.SeatRepository;
import com.cinema.seatmanagement.model.repository.ShowtimeRepository;
import com.cinema.seatmanagement.model.service.interfaces.AuditLogService;
import com.cinema.seatmanagement.model.service.interfaces.QrCodeService;
import com.cinema.seatmanagement.model.service.interfaces.QrCodeService.QrValidationResult;
import com.cinema.seatmanagement.model.service.interfaces.SeatArrivalService;
import com.cinema.seatmanagement.mqtt.MqttPublisher;
import com.cinema.seatmanagement.view.dto.response.SeatArrivalResponse;
import com.cinema.seatmanagement.websocket.SeatWebSocketHandler;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * SeatArrivalServiceImpl — handles the permanent seat QR scan.
 *
 * KEY BEHAVIOUR:
 *
 *  CORRECT SEAT: Customer scans the QR for the seat they booked.
 *    → BookingSeat: GUIDING → OCCUPIED
 *    → LED OFF (LED was ON since check-in)
 *    → WS broadcast: "Customer seated"
 *
 *  WRONG SEAT: Customer scans a seat QR that is NOT theirs.
 *    → Return 400 with message "This is not your seat"
 *    → LED for their actual booked seat keeps BLINKING (GUIDING state)
 *    → No state change
 *    NOTE: "blink" vs "solid ON" is controlled by the MQTT payload in MqttPublisher.
 *    When the seat is GUIDING and the customer hasn't arrived, we publish
 *    a BLINK command. Once OCCUPIED, we publish OFF.
 *    The GUIDING → blink mapping is handled in MqttPublisher.publishSeatCommand().
 *
 *  NO ACTIVE BOOKING: The seat QR is scanned but there's no GUIDING booking.
 *    → Return 404 with "No active booking found for this seat"
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SeatArrivalServiceImpl implements SeatArrivalService {

    private final QrCodeService          qrCodeService;
    private final SeatRepository         seatRepository;
    private final BookingSeatRepository  bookingSeatRepository;
    private final ShowtimeRepository     showtimeRepository;
    private final MqttPublisher          mqttPublisher;
    private final SeatWebSocketHandler   seatWebSocketHandler;
    private final AuditLogService        auditLogService;

    @Override
    @Transactional
    public SeatArrivalResponse processSeatArrival(String rawSeatQrPayload, Long userId) {

        // ── Step 1: Validate SEAT QR ─────────────────────────────────────────
        QrValidationResult qr = qrCodeService.validateQrPayload(rawSeatQrPayload);

        if (qr.type != QrCodeService.QrType.SEAT) {
            throw new InvalidQrCodeException(
                    "Expected SEAT QR at seat scanner, got: " + qr.type);
        }

        // ── Step 2: Load the physical seat ──────────────────────────────────
        Seat seat = seatRepository.findById(qr.seatId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Seat not found with id: " + qr.seatId));

        // ── Step 3: Find the active showtime for this screen ─────────────────
        // We look for an IN_PROGRESS showtime for the seat's screen.
        // A seat QR scan only makes sense during an active show.
        Long screenId = seat.getScreen().getId();
        Optional<Showtime> activeShowtime = showtimeRepository
                .findByScreenId(screenId)
                .stream()
                .filter(st -> st.getStatus() == ShowtimeStatus.IN_PROGRESS
                        || st.getStatus() == ShowtimeStatus.SCHEDULED
                        || st.getStatus() == ShowtimeStatus.OPEN)
                .findFirst();

        if (activeShowtime.isEmpty()) {
            return SeatArrivalResponse.builder()
                    .success(false)
                    .message("No active show found for this screen.")
                    .seatLabel(seat.getLabel())
                    .build();
        }

        Long showtimeId = activeShowtime.get().getId();

        // ── Step 4: Find the BookingSeat for this seat + showtime ─────────────
        Optional<BookingSeat> bsOpt = bookingSeatRepository
                .findBySeatIdAndShowtimeId(seat.getId(), showtimeId);

        if (bsOpt.isEmpty()) {
            return SeatArrivalResponse.builder()
                    .success(false)
                    .message("No booking found for seat " + seat.getLabel() + " in this show.")
                    .seatLabel(seat.getLabel())
                    .build();
        }

        BookingSeat bs = bsOpt.get();

        // ── Step 5: Ownership check ──────────────────────────────────────────
        Long bookingUserId = bs.getBooking().getUser().getId();
        if (!bookingUserId.equals(userId)) {
            // Customer is scanning the wrong seat's QR
            log.warn("[SeatArrival] User {} tried to scan seat {} owned by user {}",
                    userId, seat.getLabel(), bookingUserId);
            return SeatArrivalResponse.builder()
                    .success(false)
                    .message("This is not your seat. Please follow your LED guide.")
                    .seatLabel(seat.getLabel())
                    .build();
        }

        // ── Step 6: State check ──────────────────────────────────────────────
        if (bs.getSeatState() == SeatState.OCCUPIED) {
            return SeatArrivalResponse.builder()
                    .success(true)
                    .message("You are already confirmed seated. Enjoy the show!")
                    .seatLabel(seat.getLabel())
                    .build();
        }

        if (bs.getSeatState() != SeatState.GUIDING) {
            throw new IllegalStateException(
                    "Seat " + seat.getLabel() + " is in state " + bs.getSeatState()
                            + ". Cannot confirm seating.");
        }

        // ── Step 7: GUIDING → OCCUPIED ───────────────────────────────────────
        bs.setSeatState(SeatState.OCCUPIED);
        bookingSeatRepository.save(bs);

        // ── Step 8: MQTT LED OFF ─────────────────────────────────────────────
        if (seat.getLedIndex() != null) {
            mqttPublisher.publishSeatCommand(screenId, seat.getLedIndex(), SeatState.OCCUPIED);
            log.info("[SeatArrival] LED OFF → screenId={} ledIndex={} seat={}",
                    screenId, seat.getLedIndex(), seat.getLabel());
        }

        // ── Step 9: WebSocket broadcast ──────────────────────────────────────
        seatWebSocketHandler.broadcastSeatStateChange(
                showtimeId, seat.getId(),
                seat.getRowLabel(), seat.getColNumber(),
                SeatState.OCCUPIED);

        // Hall display: "Customer X is now seated"
        Map<String, Object> extras = new HashMap<>();
        extras.put("customerName", bs.getBooking().getUser().getFullName());
        extras.put("bookingCode",  bs.getBooking().getBookingCode());
        extras.put("seatLabel",    seat.getLabel());
        extras.put("seatedAt",     LocalDateTime.now().toString());
        extras.put("eventType",    "CUSTOMER_SEATED");
        seatWebSocketHandler.broadcastShowtimeEvent(showtimeId, "CUSTOMER_SEATED", extras);
        seatWebSocketHandler.broadcastAdminAlert("CUSTOMER_SEATED", extras);

        // ── Step 10: Audit log ────────────────────────────────────────────────
        auditLogService.record(
                seat.getId(), showtimeId, bs.getBooking().getId(),
                userId, "USER",
                AuditAction.SEAT_OCCUPIED, SeatState.GUIDING, SeatState.OCCUPIED,
                "Seat arrival confirmed via permanent QR scan at " + LocalDateTime.now()
        );

        log.info("[SeatArrival] SUCCESS user={} seat={} → OCCUPIED (LED OFF)", userId, seat.getLabel());

        return SeatArrivalResponse.builder()
                .success(true)
                .seatLabel(seat.getLabel())
                .movieTitle(activeShowtime.get().getMovie().getTitle())
                .startTime(activeShowtime.get().getStartTime().toString())
                .seatedAt(LocalDateTime.now().toString())
                .message("Seat confirmed! Enjoy the movie 🍿 LED is now off.")
                .build();
    }
}