package com.cinema.seatmanagement.model.service.impl;

import com.cinema.seatmanagement.exception.BookingExpiredException;
import com.cinema.seatmanagement.model.entity.Booking;
import com.cinema.seatmanagement.model.entity.BookingSeat;
import com.cinema.seatmanagement.model.enums.AuditAction;
import com.cinema.seatmanagement.model.enums.BookingStatus;
import com.cinema.seatmanagement.model.enums.SeatState;
import com.cinema.seatmanagement.model.repository.BookingRepository;
import com.cinema.seatmanagement.model.repository.BookingSeatRepository;
import com.cinema.seatmanagement.model.service.interfaces.AuditLogService;
import com.cinema.seatmanagement.model.service.interfaces.CheckinService;
import com.cinema.seatmanagement.model.service.interfaces.SeatService;
import com.cinema.seatmanagement.notification.CheckinEmailService;
import com.cinema.seatmanagement.notification.NotificationContext;
import com.cinema.seatmanagement.view.dto.request.CheckinRequest;
import com.cinema.seatmanagement.view.dto.response.BookingResponse;
import com.cinema.seatmanagement.view.mapper.BookingMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckinServiceImpl implements CheckinService {

    private final BookingRepository     bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final BookingMapper         bookingMapper;
    private final SeatService           seatService;
    private final AuditLogService       auditLogService;
    private final CheckinEmailService   checkinEmailService;

    @Override
    @Transactional
    public BookingResponse checkin(CheckinRequest request) {
        // Entity graph fetch: seats + showtime + movie in one JOIN
        Booking booking = bookingRepository.findWithDetailsByBookingCode(request.getBookingCode())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Booking not found with code: " + request.getBookingCode()));

        validateCheckinEligibility(booking);

        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setCheckedInAt(LocalDateTime.now());
        bookingRepository.save(booking);

        for (BookingSeat bs : booking.getBookingSeats()) {
            // STATE PATTERN — SeatStateContext validates BOOKED → OCCUPIED
            SeatStateContext ctx       = SeatStateContext.of(bs.getSeatState());
            SeatState        prevState = bs.getSeatState();
            SeatState        nextState = ctx.occupy();

            bs.setSeatState(nextState);
            bookingSeatRepository.save(bs);

            seatService.broadcastSeatUpdate(
                    booking.getShowtime().getId(), bs.getSeat().getId(), nextState);

            auditLogService.record(
                    bs.getSeat().getId(), booking.getShowtime().getId(), booking.getId(),
                    null, "KIOSK",
                    AuditAction.SEAT_OCCUPIED,
                    prevState, nextState,
                    "Check-in via kiosk QR scan"
            );
        }

        auditLogService.record(
                null, booking.getShowtime().getId(), booking.getId(),
                null, "KIOSK",
                AuditAction.CHECKIN_COMPLETED, null, null,
                "Booking " + booking.getBookingCode() + " checked in"
        );

        // ── Email notification — TEMPLATE METHOD PATTERN ──────────────────
        // Runs @Async — kiosk screen shows confirmation instantly without
        // waiting for SMTP. Email arrives seconds after the customer walks in.
        try {
            NotificationContext ctx = NotificationContext.fromBooking(booking);
            checkinEmailService.sendNotification(ctx);
        } catch (Exception e) {
            // Email failure must never affect the check-in result
            log.error("[Email] Failed to send check-in confirmation for booking={}: {}",
                    booking.getBookingCode(), e.getMessage(), e);
        }

        return bookingMapper.toResponse(booking);
    }

    private void validateCheckinEligibility(Booking booking) {
        switch (booking.getStatus()) {
            case CHECKED_IN -> throw new IllegalStateException(
                    "Booking has already been checked in");
            case CANCELLED  -> throw new BookingExpiredException(
                    "Booking has been cancelled");
            case EXPIRED    -> throw new BookingExpiredException(
                    "Booking has expired");
            case PENDING    -> throw new IllegalStateException(
                    "Payment has not been completed for this booking");
            case COMPLETED  -> throw new IllegalStateException(
                    "Booking has already been completed");
            case CONFIRMED  -> { /* valid — proceed */ }
        }
    }
}