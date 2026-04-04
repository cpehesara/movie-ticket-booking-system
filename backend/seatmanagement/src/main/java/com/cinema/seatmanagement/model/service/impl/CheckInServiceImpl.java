package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.exception.InvalidQrCodeException;
import com.cinema.seatmanagement.model.entity.Booking;
import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.model.entity.Seat;
import com.cinema.seatmanagement.model.enums.AuditAction;
import com.cinema.seatmanagement.model.enums.BookingStatus;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.repository.BookingRepository;
import com.cinema.seatmanagement.model.repository.BookingSeatRepository;
import com.cinema.seatmanagement.model.service.interfaces.AuditLogService;
import com.cinema.seatmanagement.model.service.interfaces.CheckInService;
import com.cinema.seatmanagement.model.service.interfaces.QrCodeService;
import com.cinema.seatmanagement.model.service.interfaces.QrCodeService.QrValidationResult;
import com.cinema.seatmanagement.mqtt.MqttPublisher;
import com.cinema.seatmanagement.notification.CheckinEmailService;
import com.cinema.seatmanagement.notification.NotificationContext;
import com.cinema.seatmanagement.view.dto.response.CheckInResponse;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckInServiceImpl implements CheckInService {

    private final QrCodeService          qrCodeService;
    private final BookingRepository      bookingRepository;
    private final BookingSeatRepository  bookingSeatRepository;
    private final MqttPublisher          mqttPublisher;
    private final SeatWebSocketHandler   seatWebSocketHandler;
    private final AuditLogService        auditLogService;
    private final CheckinEmailService    checkinEmailService;

    /**
     * Full door check-in flow.
     *
     * Steps:
     *  1. Validate QR HMAC → parse bookingCode + showtimeId + userId
     *  2. Load Booking from DB; verify it belongs to userId and showtimeId
     *  3. Guard: must not be already checked-in or cancelled
     *  4. Transition all BookingSeats: BOOKED → GUIDING
     *  5. Publish MQTT LED ON command for each seat's ledIndex
     *  6. Broadcast WebSocket event to hall display (staff screen)
     *  7. Set Booking.checkedInAt, save
     *  8. Record audit log entry
     *  9. Send check-in confirmation email async
     * 10. Return CheckInResponse
     */
    @Override
    @Transactional
    public CheckInResponse processCheckin(String rawQrPayload, Long kioskScreenId) {

        // ── Step 1: Validate QR ──────────────────────────────────────────────
        QrValidationResult qr = qrCodeService.validateQrPayload(rawQrPayload);

        if (qr.type != QrCodeService.QrType.BOOKING) {
            throw new InvalidQrCodeException(
                    "Expected BOOKING QR at door scanner, got: " + qr.type);
        }

        // ── Step 2: Load booking ─────────────────────────────────────────────
        Booking booking = bookingRepository
                .findByBookingCode(qr.bookingCode)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Booking not found: " + qr.bookingCode));

        // Verify the QR matches the right user and showtime
        if (!booking.getUser().getId().equals(qr.userId)) {
            throw new InvalidQrCodeException("QR user mismatch — potential forgery");
        }
        if (!booking.getShowtime().getId().equals(qr.showtimeId)) {
            throw new InvalidQrCodeException("QR showtime mismatch");
        }

        // ── Step 3: Guard conditions ─────────────────────────────────────────
        if (booking.getCheckedInAt() != null) {
            throw new IllegalStateException(
                    "Booking " + qr.bookingCode + " is already checked in at " + booking.getCheckedInAt());
        }
        if (booking.getStatus() == BookingStatus.CANCELLED
                || booking.getStatus() == BookingStatus.EXPIRED) {
            throw new IllegalStateException(
                    "Cannot check in — booking status is: " + booking.getStatus());
        }

        // ── Step 4: Transition seats BOOKED → GUIDING ───────────────────────
        List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingId(booking.getId());
        List<String> seatLabels = bookingSeats.stream()
                .map(bs -> bs.getSeat().getRowLabel() + "-" + bs.getSeat().getColNumber())
                .collect(Collectors.toList());

        Long showtimeId = booking.getShowtime().getId();
        Long screenId   = booking.getShowtime().getScreen().getId();

        for (BookingSeat bs : bookingSeats) {
            if (bs.getSeatState() != SeatState.BOOKED) {
                log.warn("[CheckIn] Seat {} not in BOOKED state (was {}), skipping GUIDING transition",
                        bs.getSeat().getLabel(), bs.getSeatState());
                continue;
            }

            bs.setSeatState(SeatState.GUIDING);
            bookingSeatRepository.save(bs);

            // ── Step 5: MQTT LED ON ──────────────────────────────────────────
            Seat seat = bs.getSeat();
            if (seat.getLedIndex() != null) {
                mqttPublisher.publishSeatCommand(screenId, seat.getLedIndex(), SeatState.GUIDING);
                log.info("[CheckIn] LED ON → screenId={} ledIndex={} seat={}",
                        screenId, seat.getLedIndex(), seat.getLabel());
            }

            // ── Step 6a: WebSocket per-seat broadcast ────────────────────────
            seatWebSocketHandler.broadcastSeatStateChange(
                    showtimeId, seat.getId(),
                    seat.getRowLabel(), seat.getColNumber(),
                    SeatState.GUIDING);
        }

        // ── Step 6b: Hall display event (customer entered) ───────────────────
        Map<String, Object> extras = new HashMap<>();
        extras.put("customerName",  booking.getUser().getFullName());
        extras.put("bookingCode",   booking.getBookingCode());
        extras.put("seatLabels",    seatLabels);
        extras.put("checkedInAt",   LocalDateTime.now().toString());
        extras.put("eventType",     "CUSTOMER_ENTERED");
        seatWebSocketHandler.broadcastShowtimeEvent(showtimeId, "CUSTOMER_ENTERED", extras);

        // Also broadcast to admin alert topic for the hall display dashboard
        seatWebSocketHandler.broadcastAdminAlert("CUSTOMER_ENTERED", extras);

        // ── Broadcast IoT Door Scan for Admin Monitor ──
        for (BookingSeat bs : booking.getBookingSeats()) {
            Map<String, Object> iotData = new HashMap<>();
            iotData.put("bookingCode", booking.getBookingCode());
            iotData.put("seatId", bs.getSeat().getId());
            iotData.put("seatLabel", bs.getSeat().getLabel());
            iotData.put("customerName", booking.getUser().getFullName());
            iotData.put("eventTime", LocalDateTime.now().toString());
            seatWebSocketHandler.broadcastIoTEvent(showtimeId, "DOOR_SCAN", iotData);
        }

        // ── Step 7: Update booking ───────────────────────────────────────────
        booking.setCheckedInAt(LocalDateTime.now());
        if (booking.getStatus() == BookingStatus.PENDING) {
            // Edge case: payment confirmed but status not updated yet
            booking.setStatus(BookingStatus.CONFIRMED);
        }
        bookingRepository.save(booking);

        // ── Step 8: Audit log ────────────────────────────────────────────────
        auditLogService.record(
                null, showtimeId, booking.getId(),
                booking.getUser().getId(), "KIOSK",
                AuditAction.CHECKIN_COMPLETED, SeatState.BOOKED, SeatState.GUIDING,
                "Door check-in: seats " + String.join(", ", seatLabels) + " → GUIDING (LED ON)"
        );

        // ── Step 9: Email (async) ────────────────────────────────────────────
        checkinEmailService.sendNotification(NotificationContext.fromBooking(booking));

        // ── Step 10: Build response ──────────────────────────────────────────
        log.info("[CheckIn] SUCCESS booking={} customer='{}' seats={}",
                booking.getBookingCode(), booking.getUser().getFullName(), seatLabels);

        return CheckInResponse.builder()
                .success(true)
                .bookingCode(booking.getBookingCode())
                .customerName(booking.getUser().getFullName())
                .movieTitle(booking.getShowtime().getMovie().getTitle())
                .screenName(booking.getShowtime().getScreen().getName())
                .startTime(booking.getShowtime().getStartTime().toString())
                .seatLabels(seatLabels)
                .checkedInAt(booking.getCheckedInAt().toString())
                .message("Welcome! Your LED seat guide is now ON. Follow the green light.")
                .build();
    }
}